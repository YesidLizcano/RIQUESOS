'use server';

// Cliente Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { requireSession } from './auth';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { GestionarClientes } from '@/application/use-cases/GestionarClientes';
import { crearClienteSchema, actualizarClienteSchema, eliminarClienteSchema } from '@/presentation/validations/cliente.schema';
import type { CrearClienteRequest, ActualizarClienteRequest, ClienteResponse } from '../dtos';
import type { VentaResponse } from '../dtos/venta.dto';
import { handlePrismaError } from './utils';
import { prisma } from '@/infrastructure/db';

import { logger } from '@/infrastructure/pino-logger';

async function getGestionarClientesUseCase() {
  const clienteRepo = new PrismaClienteRepo();
  return new GestionarClientes(clienteRepo);
}

function clienteToResponse(cliente: import('@/domain/entities/Cliente').Cliente): ClienteResponse {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    tipo: cliente.tipo,
    precioDobleCremaEntero: cliente.precioDobleCremaEntero?.value ?? null,
    precioDobleCremaTajado: cliente.precioDobleCremaTajado?.value ?? null,
    precioSemisalado: cliente.precioSemisalado?.value ?? null,
    valorDomicilio: cliente.valorDomicilio.value,
    deletedAt: cliente.deletedAt?.toISOString() ?? null,
  };
}

export async function crearCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = crearClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearClienteRequest = {
    nombre: parsed.data.nombre,
    tipo: parsed.data.tipo,
    precioDobleCremaEntero: parsed.data.precioDobleCremaEntero || undefined,
    precioDobleCremaTajado: parsed.data.precioDobleCremaTajado || undefined,
    precioSemisalado: parsed.data.precioSemisalado || undefined,
    valorDomicilio: parsed.data.valorDomicilio || undefined,
  };

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.crear(request);

    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating cliente');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un cliente con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear cliente',
    };
  }
}

export async function actualizarCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = actualizarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarClienteRequest = {
    id: parsed.data.id,
    nombre: parsed.data.nombre || undefined,
    precioDobleCremaEntero: parsed.data.precioDobleCremaEntero || undefined,
    precioDobleCremaTajado: parsed.data.precioDobleCremaTajado || undefined,
    precioSemisalado: parsed.data.precioSemisalado || undefined,
    valorDomicilio: parsed.data.valorDomicilio || undefined,
  };

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.actualizar(request);

    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating cliente');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un cliente con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cliente',
    };
  }
}

export async function eliminarCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = eliminarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarClientesUseCase();
    await useCase.eliminar(parsed.data.id);

    revalidatePath('/clientes');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting cliente');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'No se puede eliminar un cliente con ventas asociadas' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar cliente',
    };
  }
}

export async function restaurarCliente(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.restaurar(id);

    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring cliente');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un cliente activo con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al restaurar cliente',
    };
  }
}

export async function getClientes() {
  await requireSession();

  try {
    const useCase = await getGestionarClientesUseCase();
    const clientes = await useCase.obtenerTodos();
    return { success: true, clientes: clientes.map(clienteToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching clientes');
    return { success: false, error: 'Error al obtener clientes', clientes: [] };
  }
}

export async function getClientesIncludeDeleted() {
  await requireSession();

  try {
    const clienteRepo = new PrismaClienteRepo();
    const deletedClientes = await clienteRepo.findDeleted();
    const activeResult = await getClientes();
    const active = activeResult.success && activeResult.clientes ? activeResult.clientes : [];
    return { success: true, clientes: [...active, ...deletedClientes.map(clienteToResponse)] };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching clientes including deleted');
    return { success: false, error: 'Error al obtener clientes', clientes: [] };
  }
}

export async function getClienteById(id: string) {
  await requireSession();

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.obtenerPorId(id);
    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cliente');
    return { success: false, error: 'Error al obtener cliente' };
  }
}

export interface HistorialClienteResponse {
  cliente: {
    id: string;
    nombre: string;
    tipo: string;
  };
  ventas: VentaResponse[];
  totalVentas: number;
  totalIngresos: string;
  totalGanancia: string;
  saldoPendiente: string;
}

export async function getHistorialCliente(clienteId: string): Promise<{ success: boolean; data?: HistorialClienteResponse; error?: string }> {
  await requireSession();

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, nombre: true, tipo: true },
    });

    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }

    const ventaRecords = await prisma.venta.findMany({
      where: { clienteId },
      orderBy: { fecha: 'desc' },
      include: { items: { include: { lote: { include: { proveedor: { select: { id: true, nombre: true } } } } } }, sede: true },
    });

    const ventas: VentaResponse[] = ventaRecords.map((v) => {
      const saldo = new Prisma.Decimal(v.ingresoTotal.toString()).minus(new Prisma.Decimal(v.abono.toString())).toString();
      return {
        id: v.id,
        fecha: v.fecha.toISOString(),
        clienteId: v.clienteId,
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
        items: v.items.map((item) => ({
          id: item.id,
          ventaId: item.ventaId,
          loteId: item.loteId,
          ventaTipo: item.ventaTipo as 'BLOQUES' | 'GRANEL',
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
          sueltosEnteroDelta: item.sueltosEnteroDelta?.toString() ?? '0',
          sueltosTajadoDelta: item.sueltosTajadoDelta?.toString() ?? '0',
          loteProducto: item.lote?.producto ?? '',
          loteProveedorNombre: item.lote?.proveedor?.nombre ?? '',
        })),
      };
    });

    let totalIngresos = new Prisma.Decimal(0);
    let totalGanancia = new Prisma.Decimal(0);
    let saldoPendiente = new Prisma.Decimal(0);

    for (const v of ventaRecords) {
      totalIngresos = totalIngresos.add(new Prisma.Decimal(v.ingresoTotal.toString()));
      totalGanancia = totalGanancia.add(new Prisma.Decimal(v.gananciaBruta.toString()));
      if (v.metodoPago === 'CREDITO') {
        const saldo = new Prisma.Decimal(v.ingresoTotal.toString()).minus(new Prisma.Decimal(v.abono.toString()));
        if (saldo.greaterThan(0)) {
          saldoPendiente = saldoPendiente.add(saldo);
        }
      }
    }

    return {
      success: true,
      data: {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          tipo: cliente.tipo,
        },
        ventas,
        totalVentas: ventaRecords.length,
        totalIngresos: totalIngresos.toString(),
        totalGanancia: totalGanancia.toString(),
        saldoPendiente: saldoPendiente.toString(),
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching historial cliente');
    return { success: false, error: 'Error al cargar historial del cliente' };
  }
}