'use server';

// Lote Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { CrearLote } from '@/application/use-cases/CrearLote';
import { TipoProducto } from '@/domain/enums';
import type { CrearLoteRequest, LoteResponse } from '../dtos';
import { logger } from '@/infrastructure/pino-logger';

async function getCrearLoteUseCase() {
  const loteRepo = new PrismaLoteRepo();
  const proveedorRepo = new PrismaProveedorRepo();
  return new CrearLote(loteRepo, proveedorRepo);
}

function loteToResponse(lote: import('@/domain/entities/Lote').Lote): LoteResponse {
  return {
    id: lote.id,
    producto: lote.producto,
    fechaIngreso: lote.fechaIngreso.toISOString(),
    proveedorId: lote.proveedorId,
    cantidadCompradaKg: lote.cantidadCompradaKg.value,
    precioCompraBaseKg: lote.precioCompraBaseKg.value,
    costoFlete: lote.costoFlete.value,
    costoTajado: lote.costoTajado.value,
    costoEmpaques: lote.costoEmpaques.value,
    costoRealCalculadoKg: lote.costoRealCalculadoKg.value,
    stockDisponibleKg: lote.stockDisponibleKg.value,
    estado: lote.estado,
    version: lote.version,
  };
}

export async function crearLote(formData: FormData) {
  await requireSession();

  const request: CrearLoteRequest = {
    producto: formData.get('producto') as TipoProducto,
    proveedorId: formData.get('proveedorId') as string,
    cantidadCompradaKg: formData.get('cantidadCompradaKg') as string,
    precioCompraBaseKg: formData.get('precioCompraBaseKg') as string,
    costoFlete: (formData.get('costoFlete') as string) || undefined,
    costoTajado: (formData.get('costoTajado') as string) || undefined,
    costoEmpaques: (formData.get('costoEmpaques') as string) || undefined,
  };

  try {
    const useCase = await getCrearLoteUseCase();
    const { lote } = await useCase.execute(request);
    revalidatePath('/lotes');
    return { success: true, lote: loteToResponse(lote) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating lote');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating lote',
    };
  }
}

export async function getLotes() {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const lotes = await loteRepo.findActive();
    return { success: true, lotes: lotes.map(loteToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching lotes');
    return { success: false, error: 'Error fetching lotes', lotes: [] };
  }
}

export async function getLoteById(id: string) {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const lote = await loteRepo.findById(id);
    if (!lote) {
      return { success: false, error: 'Lote not found' };
    }
    return { success: true, lote: loteToResponse(lote) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching lote');
    return { success: false, error: 'Error fetching lote' };
  }
}