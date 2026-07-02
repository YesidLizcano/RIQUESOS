'use server';

// Venta Server Actions — thin controllers, delegate to use cases
// Session guard: all Venta actions require authenticated user
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { RegistrarVenta } from '@/application/use-cases/RegistrarVenta';
import type { RegistrarVentaRequest, VentaResponse } from '../dtos';
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
  };
}

export async function registrarVenta(formData: FormData) {
  await requireSession();

  const request: RegistrarVentaRequest = {
    clienteId: formData.get('clienteId') as string,
    loteId: formData.get('loteId') as string,
    cantidadVendidaKg: formData.get('cantidadVendidaKg') as string,
    standardPricePerKg: formData.get('standardPricePerKg') as string,
    valorDomicilio: (formData.get('valorDomicilio') as string) || undefined,
    domiciliario: (formData.get('domiciliario') as string) || undefined,
  };

  try {
    const useCase = await getRegistrarVentaUseCase();
    const { venta } = await useCase.execute(request);
    revalidatePath('/ventas');
    logger.info({ ventaId: venta.id, loteId: venta.loteId, cantidad: venta.cantidadVendidaKg.value }, 'Venta registered successfully');
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

export async function getVentasByDateRange(inicio: Date, fin: Date) {
  await requireSession();

  try {
    const ventaRepo = new PrismaVentaRepo();
    const ventas = await ventaRepo.findByDateRange(inicio, fin);
    return { success: true, ventas: ventas.map(ventaToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ventas by date range');
    return { success: false, error: 'Error fetching ventas', ventas: [] };
  }
}