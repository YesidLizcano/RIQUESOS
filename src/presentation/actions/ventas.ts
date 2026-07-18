'use server';

// Venta Server Actions — thin controllers, delegate to use cases
// Session guard: all Venta actions require authenticated user
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { PrismaEmpaqueRepo } from '@/infrastructure/repositories/PrismaEmpaqueRepo';
import { PrismaCompraInsumoRepo } from '@/infrastructure/repositories/PrismaCompraInsumoRepo';
import { PrismaPrecioClienteProveedorRepo } from '@/infrastructure/repositories/PrismaPrecioClienteProveedorRepo';
import { RegistrarVenta } from '@/application/use-cases/RegistrarVenta';
import { EliminarVenta } from '@/application/use-cases/EliminarVenta';
import { EditarVenta } from '@/application/use-cases/EditarVenta';
import { logger } from '@/infrastructure/pino-logger';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db';
import { OrigenCorte, OrigenTajadoGranel } from '@/domain/enums';
import { ConcurrencyError } from '@/domain/errors/ConcurrencyError';
import type { VentaResponse, VentaItemResponse, VentaTipo, AbonoMetodoPagoBreakdown } from '../dtos';

function ventaRecordToResponse(v: {
  id: string;
  fecha: Date;
  clienteId: string;
  cantidadTotalKg: { toString(): string };
  ingresoTotal: { toString(): string };
  costoAplicado: { toString(): string };
  gananciaBruta: { toString(): string };
  valorDomicilio: { toString(): string };
  costoDomiciliario: { toString(): string };
  domiciliario: string;
  metodoPago: string;
  metodoPagoAbono: string | null;
  abono: { toString(): string };
  observaciones: string | null;
  items: Array<Parameters<typeof ventaItemToResponse>[0]>;
  cliente?: { nombre: string } | null;
  sede?: { nombre: string } | null;
  sedeId?: string | null;
}): VentaResponse {
  const saldo = new Prisma.Decimal(v.ingresoTotal.toString()).minus(new Prisma.Decimal(v.abono.toString())).toString();
  return {
    id: v.id,
    fecha: v.fecha.toISOString(),
    clienteId: v.clienteId,
    clienteNombre: v.cliente?.nombre ?? undefined,
    sedeId: v.sedeId ?? null,
    sedeNombre: v.sede?.nombre ?? null,
    cantidadTotalKg: v.cantidadTotalKg.toString(),
    ingresoTotal: v.ingresoTotal.toString(),
    costoAplicado: v.costoAplicado.toString(),
    gananciaBruta: v.gananciaBruta.toString(),
    valorDomicilio: v.valorDomicilio.toString(),
    costoDomiciliario: v.costoDomiciliario.toString(),
    domiciliario: v.domiciliario,
    metodoPago: v.metodoPago,
    metodoPagoAbono: v.metodoPagoAbono,
    abono: v.abono.toString(),
    saldo,
    observaciones: v.observaciones,
    items: v.items.map(ventaItemToResponse),
  };
}

async function getRegistrarVentaUseCase() {
  const ventaRepo = new PrismaVentaRepo();
  const loteRepo = new PrismaLoteRepo();
  const clienteRepo = new PrismaClienteRepo();
  const empaqueRepo = new PrismaEmpaqueRepo();
  const compraInsumoRepo = new PrismaCompraInsumoRepo();
  const precioClienteProveedorRepo = new PrismaPrecioClienteProveedorRepo();
  return new RegistrarVenta(ventaRepo, loteRepo, clienteRepo, empaqueRepo, compraInsumoRepo, precioClienteProveedorRepo);
}

function ventaItemToResponse(item: {
  id: string;
  ventaId: string;
  loteId: string;
  ventaTipo: string;
  cantidadKg: { toString(): string };
  precioVentaKg: { toString(): string };
  ingreso: { toString(): string };
  costoAplicadoKg: { toString(): string };
  costoAplicado: { toString(): string };
  bloquesEnterosVendidos: number;
  bloquesTajadosVendidos: number;
  bloquesTajadosDeFabricaVendidos: number;
  bloquesTajadosInternosVendidos: number;
  bloquesReempacados: number;
  costoEmpaques: { toString(): string };
  precioEnteroBloque?: { toString(): string } | null;
  precioTajadoBloque?: { toString(): string } | null;
  origenCorte?: string | null;
  origenTajadoGranel?: string | null;
  sueltosEnteroDelta?: { toString(): string } | null;
  sueltosTajadoDelta?: { toString(): string } | null;
}): VentaItemResponse {
  return {
    id: item.id,
    ventaId: item.ventaId,
    loteId: item.loteId,
    ventaTipo: item.ventaTipo as VentaTipo,
    cantidadKg: item.cantidadKg.toString(),
    precioVentaKg: item.precioVentaKg.toString(),
    ingreso: item.ingreso.toString(),
    costoAplicadoKg: item.costoAplicadoKg.toString(),
    costoAplicado: item.costoAplicado.toString(),
    bloquesEnterosVendidos: item.bloquesEnterosVendidos,
    bloquesTajadosVendidos: item.bloquesTajadosVendidos,
    bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
    bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
    bloquesReempacados: item.bloquesReempacados,
    costoEmpaques: item.costoEmpaques.toString(),
    precioEnteroBloque: item.precioEnteroBloque?.toString() ?? null,
    precioTajadoBloque: item.precioTajadoBloque?.toString() ?? null,
     origenCorte: item.origenCorte ?? 'ENTERO',
     origenTajadoGranel: item.origenTajadoGranel ?? null,
     sueltosEnteroDelta: item.sueltosEnteroDelta?.toString() ?? '0',
    sueltosTajadoDelta: item.sueltosTajadoDelta?.toString() ?? '0',
  };
}

/**
 * Compute the metodoPago breakdown for a CREDITO venta.
 * Combines the initial abono (metodoPagoAbono) with all AbonoPago records,
 * grouping by payment method and computing proportion vs ingresoTotal.
 */
function computeAbonoMetodoPagoBreakdown(
  venta: { abono: { toString(): string }; metodoPagoAbono: string | null; ingresoTotal: { toString(): string } },
  abonoPagos: Array<{ monto: { toString(): string }; metodoPago: string }>,
): AbonoMetodoPagoBreakdown[] {
  const ingresoTotal = new Prisma.Decimal(venta.ingresoTotal.toString());
  if (ingresoTotal.isZero()) return [];

  const map = new Map<string, Prisma.Decimal>();

  // Initial abono (metodoPagoAbono) contributes to the breakdown
  const initialAbono = new Prisma.Decimal(venta.abono.toString());
  if (initialAbono.gt(0) && venta.metodoPagoAbono) {
    map.set(venta.metodoPagoAbono, (map.get(venta.metodoPagoAbono) ?? new Prisma.Decimal(0)).plus(initialAbono));
  }

  // Each subsequent AbonoPago record
  for (const ap of abonoPagos) {
    const monto = new Prisma.Decimal(ap.monto.toString());
    const existing = map.get(ap.metodoPago) ?? new Prisma.Decimal(0);
    map.set(ap.metodoPago, existing.plus(monto));
  }

  const breakdown: AbonoMetodoPagoBreakdown[] = [];
  // Calculate percentage relative to total abonado, not ingresoTotal
  // This ensures percentages sum to 100% and no single method exceeds 100%
  const totalAbonado = Array.from(map.values()).reduce((sum, m) => sum.plus(m), new Prisma.Decimal(0));
  for (const [metodoPago, monto] of map) {
    const porcentaje = totalAbonado.gt(0)
      ? Number(monto.div(totalAbonado).mul(100).toFixed(1))
      : 0;
    breakdown.push({ metodoPago, monto: monto.toFixed(0), porcentaje });
  }

  return breakdown;
}

export async function registrarVenta(input: {
  clienteId: string;
  sedeId?: string | null;
  items: Array<{
    loteId: string;
    ventaTipo: VentaTipo;
    cantidadKg: string;
    precioVentaKg: string;
    bloquesEnterosVendidos?: number;
    bloquesTajadosVendidos?: number;
    bloquesTajadosDeFabricaVendidos?: number;
    bloquesTajadosInternosVendidos?: number;
    bloquesReempacados?: number;
    precioEnteroBloque?: string;
    precioTajadoBloque?: string;
    origenCorte?: string;
    origenTajadoGranel?: string;
  }>;
  valorDomicilio?: string;
  costoDomiciliario?: string;
  domiciliario?: string;
  metodoPago?: string;
  metodoPagoAbono?: string;
  abono?: string;
  observaciones?: string;
}) {
  await requireSession();

  try {
    const useCase = await getRegistrarVentaUseCase();
    const result = await useCase.execute({
      ...input,
      sedeId: input.sedeId,
      items: input.items.map((item) => ({
        ...item,
        origenCorte: item.origenCorte as OrigenCorte | undefined,
        origenTajadoGranel: item.origenTajadoGranel as OrigenTajadoGranel | undefined,
      })),
    });

    const ventaResponse: VentaResponse = {
      id: result.venta.id,
      fecha: result.venta.fecha.toISOString(),
      clienteId: result.venta.clienteId,
      sedeId: result.venta.sedeId,
      cantidadTotalKg: result.venta.cantidadTotalKg.value,
      ingresoTotal: result.venta.ingresoTotal.value,
      costoAplicado: result.venta.costoAplicado.value,
      gananciaBruta: result.venta.gananciaBruta.value,
      valorDomicilio: result.venta.valorDomicilio.value,
      costoDomiciliario: result.venta.costoDomiciliario.value,
      domiciliario: result.venta.domiciliario,
      metodoPago: result.venta.metodoPago,
      metodoPagoAbono: result.venta.metodoPagoAbono,
      abono: result.venta.abono.value,
      saldo: result.venta.saldo.value,
      observaciones: result.venta.observaciones || null,
      items: result.items.map(ventaItemToResponse),
    };

    revalidatePath('/ventas');
    revalidatePath('/lotes');
    revalidatePath('/');
    logger.info({ ventaId: result.venta.id, items: result.items.length }, 'Venta registered successfully');
    return { success: true, venta: ventaResponse };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'Los datos del lote fueron modificados recientemente por otra operación. Se actualizará la pantalla para obtener los datos más recientes.',
        concurrencyError: true,
      };
    }
    logger.warn({ err: error }, 'Venta registration failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar venta',
    };
  }
}

export async function getVentas() {
  await requireSession();

  try {
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const ventaRecords = await prisma.venta.findMany({
      where: { fecha: { gte: inicio, lte: now } },
      orderBy: { fecha: 'desc' },
      include: { items: true, sede: true },
    });
    const response: VentaResponse[] = ventaRecords.map(ventaRecordToResponse);
    return { success: true, ventas: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas');
    return { success: false, error: 'Error al obtener ventas', ventas: [] };
  }
}

export async function getVentasByDateRange(month: number, year: number) {
  await requireSession();

  try {
    let ventaRecords;

    if (month === -1) {
      const inicio = new Date(2000, 0, 1);
      const fin = new Date(2100, 11, 31, 23, 59, 59, 999);
      ventaRecords = await prisma.venta.findMany({
        where: { fecha: { gte: inicio, lte: fin } },
        orderBy: { fecha: 'desc' },
        include: { items: true, cliente: true, sede: true },
      });
    } else {
      const inicio = new Date(year, month, 1);
      const fin = new Date(year, month + 1, 0, 23, 59, 59, 999);
      ventaRecords = await prisma.venta.findMany({
        where: { fecha: { gte: inicio, lte: fin } },
        orderBy: { fecha: 'desc' },
        include: { items: true, cliente: true, sede: true },
      });
    }

    const response: VentaResponse[] = ventaRecords.map(ventaRecordToResponse);

    // Enrich CREDITO ventas with abonoMetodoPagoBreakdown
    const creditoVentaIds = ventaRecords
      .filter((v) => v.metodoPago === 'CREDITO')
      .map((v) => v.id);

    if (creditoVentaIds.length > 0) {
      const allAbonoPagos = await prisma.abonoPago.findMany({
        where: { ventaId: { in: creditoVentaIds } },
      });

      const abonoPagoByVentaId = new Map<string, typeof allAbonoPagos>();
      for (const ap of allAbonoPagos) {
        const list = abonoPagoByVentaId.get(ap.ventaId) ?? [];
        list.push(ap);
        abonoPagoByVentaId.set(ap.ventaId, list);
      }

      for (let i = 0; i < ventaRecords.length; i++) {
        const v = ventaRecords[i];
        if (v.metodoPago !== 'CREDITO') continue;
        const ventaAbonos = abonoPagoByVentaId.get(v.id) ?? [];
        response[i].abonoMetodoPagoBreakdown = computeAbonoMetodoPagoBreakdown(v, ventaAbonos);
      }
    }

    return { success: true, ventas: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas by date range');
    return { success: false, error: 'Error al obtener ventas', ventas: [] };
  }
}

export async function getVentasByExactDateRange(inicio: string, fin: string) {
  await requireSession();

  try {
    const inicioDate = new Date(inicio + 'T00:00:00');
    const finDate = new Date(fin + 'T23:59:59.999');

    const ventaRecords = await prisma.venta.findMany({
      where: { fecha: { gte: inicioDate, lte: finDate } },
      orderBy: { fecha: 'desc' },
      include: { items: true, cliente: true, sede: true },
    });

    // Resolve lote producto for each item (needed for PDF product detail)
    const loteIds = [...new Set(ventaRecords.flatMap((v) => v.items.map((i) => i.loteId)))];
    const lotes = loteIds.length > 0
      ? await prisma.lote.findMany({ where: { id: { in: loteIds } }, include: { proveedor: true } })
      : [];
    const loteMap = new Map(lotes.map((l) => [l.id, l]));

    const response: VentaResponse[] = ventaRecords.map((v) => ({
      ...ventaRecordToResponse(v),
      items: v.items.map((item) => {
        const lote = loteMap.get(item.loteId);
        return {
          ...ventaItemToResponse(item),
          loteProducto: lote?.producto ?? '',
          loteProveedorNombre: lote?.proveedor?.nombre ?? '',
        };
      }),
    }));

    // Enrich CREDITO ventas with abonoMetodoPagoBreakdown
    const creditoVentaIds = ventaRecords
      .filter((v) => v.metodoPago === 'CREDITO')
      .map((v) => v.id);

    if (creditoVentaIds.length > 0) {
      const allAbonoPagos = await prisma.abonoPago.findMany({
        where: { ventaId: { in: creditoVentaIds } },
      });

      const abonoPagoByVentaId = new Map<string, typeof allAbonoPagos>();
      for (const ap of allAbonoPagos) {
        const list = abonoPagoByVentaId.get(ap.ventaId) ?? [];
        list.push(ap);
        abonoPagoByVentaId.set(ap.ventaId, list);
      }

      for (let i = 0; i < ventaRecords.length; i++) {
        const v = ventaRecords[i];
        if (v.metodoPago !== 'CREDITO') continue;
        const ventaAbonos = abonoPagoByVentaId.get(v.id) ?? [];
        response[i].abonoMetodoPagoBreakdown = computeAbonoMetodoPagoBreakdown(v, ventaAbonos);
      }
    }

    return { success: true, ventas: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas by exact date range');
    return { success: false, error: 'Error al obtener ventas', ventas: [] };
  }
}

export async function eliminarVenta(input: { ventaId: string }) {
  await requireSession();

  try {
    const ventaRepo = new PrismaVentaRepo();
    const loteRepo = new PrismaLoteRepo();
    const empaqueRepo = new PrismaEmpaqueRepo();
    const useCase = new EliminarVenta(ventaRepo, loteRepo, empaqueRepo);
    await useCase.execute(input);

    revalidatePath('/ventas');
    revalidatePath('/lotes');
    revalidatePath('/');
    revalidatePath('/insumos');
    logger.info({ ventaId: input.ventaId }, 'Venta deleted successfully');
    return { success: true };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'Los datos del lote fueron modificados recientemente por otra operación. Se actualizará la pantalla para obtener los datos más recientes.',
        concurrencyError: true,
      };
    }
    logger.warn({ err: error }, 'Venta deletion failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar venta',
    };
  }
}

export async function editarVenta(input: {
  ventaId: string;
  clienteId: string;
  sedeId?: string | null;
  items: Array<{
    loteId: string;
    ventaTipo: VentaTipo;
    cantidadKg: string;
    precioVentaKg: string;
    bloquesEnterosVendidos?: number;
    bloquesTajadosVendidos?: number;
    bloquesTajadosDeFabricaVendidos?: number;
    bloquesTajadosInternosVendidos?: number;
    bloquesReempacados?: number;
    precioEnteroBloque?: string;
    precioTajadoBloque?: string;
    origenCorte?: string;
    origenTajadoGranel?: string;
  }>;
  valorDomicilio?: string;
  costoDomiciliario?: string;
  domiciliario?: string;
  metodoPago?: string;
  metodoPagoAbono?: string;
  abono?: string;
  observaciones?: string;
}) {
  await requireSession();

  try {
    const ventaRepo = new PrismaVentaRepo();
    const loteRepo = new PrismaLoteRepo();
    const clienteRepo = new PrismaClienteRepo();
    const empaqueRepo = new PrismaEmpaqueRepo();
    const compraInsumoRepo = new PrismaCompraInsumoRepo();
    const precioClienteProveedorRepo = new PrismaPrecioClienteProveedorRepo();
    const useCase = new EditarVenta(ventaRepo, loteRepo, clienteRepo, empaqueRepo, compraInsumoRepo, precioClienteProveedorRepo);
    const result = await useCase.execute({
      ventaId: input.ventaId,
      clienteId: input.clienteId,
      sedeId: input.sedeId,
      items: input.items.map((item) => ({
        ...item,
        origenCorte: item.origenCorte as OrigenCorte | undefined,
        origenTajadoGranel: item.origenTajadoGranel as OrigenTajadoGranel | undefined,
      })),
      valorDomicilio: input.valorDomicilio,
      costoDomiciliario: input.costoDomiciliario,
      domiciliario: input.domiciliario,
      metodoPago: input.metodoPago,
      metodoPagoAbono: input.metodoPagoAbono,
      abono: input.abono,
      observaciones: input.observaciones,
    });

    const ventaResponse: VentaResponse = {
      id: result.venta.id,
      fecha: result.venta.fecha.toISOString(),
      clienteId: result.venta.clienteId,
      sedeId: result.venta.sedeId,
      cantidadTotalKg: result.venta.cantidadTotalKg.value,
      ingresoTotal: result.venta.ingresoTotal.value,
      costoAplicado: result.venta.costoAplicado.value,
      gananciaBruta: result.venta.gananciaBruta.value,
      valorDomicilio: result.venta.valorDomicilio.value,
      costoDomiciliario: result.venta.costoDomiciliario.value,
      domiciliario: result.venta.domiciliario,
      metodoPago: result.venta.metodoPago,
      metodoPagoAbono: result.venta.metodoPagoAbono,
      abono: result.venta.abono.value,
      saldo: result.venta.saldo.value,
      observaciones: result.venta.observaciones || null,
      items: result.items.map(ventaItemToResponse),
    };

    revalidatePath('/ventas');
    revalidatePath('/lotes');
    revalidatePath('/');
    revalidatePath('/insumos');
    logger.info({ ventaId: result.venta.id, oldVentaId: input.ventaId }, 'Venta edited successfully');
    return { success: true, venta: ventaResponse };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'Los datos del lote fueron modificados recientemente por otra operación. Se actualizará la pantalla para obtener los datos más recientes.',
        concurrencyError: true,
      };
    }
    logger.warn({ err: error }, 'Venta edit failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al editar venta',
    };
  }
}

export async function getVentaDetalle(input: { ventaId: string }) {
  await requireSession();

  try {
    const ventaRecord = await prisma.venta.findUnique({
      where: { id: input.ventaId },
      include: {
        items: true,
        cliente: true,
        sede: true,
      },
    });

    if (!ventaRecord) {
      return { success: false, error: 'Venta no encontrada' };
    }

    // Fetch lote info for each item
    const loteIds = ventaRecord.items.map((item) => item.loteId);
    const lotes = await prisma.lote.findMany({
      where: { id: { in: loteIds } },
      include: { proveedor: true },
    });
    const loteMap = new Map(lotes.map((l) => [l.id, l]));

    // Fetch abono history for credit sales
    const abonos = await prisma.abonoPago.findMany({
      where: { ventaId: input.ventaId },
      orderBy: { fecha: 'asc' },
    });

    const response: VentaResponse = {
      ...ventaRecordToResponse(ventaRecord),
      clienteNombre: ventaRecord.cliente?.nombre ?? '',
      items: ventaRecord.items.map((item) => {
        const lote = loteMap.get(item.loteId);
        return {
          ...ventaItemToResponse(item),
          loteProducto: lote?.producto ?? '',
          loteProveedorNombre: lote?.proveedor?.nombre ?? '',
        };
      }),
      abonos: abonos.map((a) => ({
        id: a.id,
        ventaId: a.ventaId,
        monto: a.monto.toString(),
        metodoPago: a.metodoPago,
        observacion: a.observacion,
        fecha: a.fecha.toISOString(),
      })),
    };

    return { success: true, venta: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching venta detalle');
    return { success: false, error: 'Error al obtener detalle de venta' };
  }
}