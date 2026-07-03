'use server';

// Venta Server Actions — thin controllers, delegate to use cases
// Session guard: all Venta actions require authenticated user
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { RegistrarVenta } from '@/application/use-cases/RegistrarVenta';
import { registrarVentaSchema } from '@/presentation/validations/venta.schema';
import type { RegistrarVentaRequest, VentaResponse, VentaTipo } from '../dtos';
import { logger } from '@/infrastructure/pino-logger';

async function getRegistrarVentaUseCase() {
  const ventaRepo = new PrismaVentaRepo();
  const loteRepo = new PrismaLoteRepo();
  const clienteRepo = new PrismaClienteRepo();
  return new RegistrarVenta(ventaRepo, loteRepo, clienteRepo);
}

function ventaToResponse(venta: import('@/domain/entities/Venta').Venta): VentaResponse {
  return {
    id: venta.id,
    fecha: venta.fecha.toISOString(),
    clienteId: venta.clienteId,
    loteId: venta.loteId,
    cantidadVendidaKg: venta.cantidadVendidaKg.value,
    precioVentaKg: venta.precioVentaKg.value,
    ingresoTotal: venta.ingresoTotal.value,
    costoAplicado: venta.costoAplicado.value,
    gananciaBruta: venta.gananciaBruta.value,
    valorDomicilio: venta.valorDomicilio.value,
    domiciliario: venta.domiciliario,
    ventaTipo: venta.ventaTipo,
  };
}

export async function registrarVenta(formData: FormData) {
  await requireSession();

  const parsed = registrarVentaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: RegistrarVentaRequest = {
    clienteId: parsed.data.clienteId,
    loteId: parsed.data.loteId,
    cantidadVendidaKg: String(parsed.data.cantidadVendidaKg),
    standardPricePerKg: String(parsed.data.standardPricePerKg),
    valorDomicilio: parsed.data.valorDomicilio ? String(parsed.data.valorDomicilio) : undefined,
    domiciliario: parsed.data.domiciliario || undefined,
    ventaTipo: (parsed.data.ventaTipo as VentaTipo) ?? 'GRANEL',
  };

  try {
    const useCase = await getRegistrarVentaUseCase();
    const { venta } = await useCase.execute(request);
    revalidatePath('/ventas');
    logger.info({ ventaId: venta.id, loteId: venta.loteId, cantidad: venta.cantidadVendidaKg.value, ventaTipo: venta.ventaTipo }, 'Venta registered successfully');
    return { success: true, venta: ventaToResponse(venta) };
  } catch (error) {
    logger.warn({ err: error }, 'Venta registration failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error registering venta',
    };
  }
}

export async function getVentas() {
  await requireSession();

  try {
    const ventaRepo = new PrismaVentaRepo();
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const ventas = await ventaRepo.findByDateRange(inicio, now);
    return { success: true, ventas: ventas.map(ventaToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas');
    return { success: false, error: 'Error fetching ventas', ventas: [] };
  }
}

export async function getVentasByDateRange(month: number, year: number) {
  await requireSession();

  try {
    const ventaRepo = new PrismaVentaRepo();

    if (month === -1) {
      // "Todos" — return all ventas without date filter
      const inicio = new Date(2000, 0, 1);
      const fin = new Date(2100, 11, 31, 23, 59, 59, 999);
      const allVentas = await ventaRepo.findByDateRange(inicio, fin);
      return { success: true, ventas: allVentas.map(ventaToResponse) };
    }

    const inicio = new Date(year, month, 1);
    const fin = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const ventas = await ventaRepo.findByDateRange(inicio, fin);
    return { success: true, ventas: ventas.map(ventaToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas by date range');
    return { success: false, error: 'Error fetching ventas', ventas: [] };
  }
}