'use server';

// Lote Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { CrearLote } from '@/application/use-cases/CrearLote';
import { ModificarLote } from '@/application/use-cases/ModificarLote';
import { crearLoteSchema, actualizarLoteSchema } from '@/presentation/validations/lote.schema';
import { eliminarProveedorSchema } from '@/presentation/validations/proveedor.schema';
import type { CrearLoteRequest, ActualizarLoteRequest, LoteResponse } from '../dtos';
import { ConcurrencyError } from '@/domain/errors/ConcurrencyError';
import { handlePrismaError } from './utils';
import { logger } from '@/infrastructure/pino-logger';

async function getCrearLoteUseCase() {
  const loteRepo = new PrismaLoteRepo();
  const proveedorRepo = new PrismaProveedorRepo();
  return new CrearLote(loteRepo, proveedorRepo);
}

async function getModificarLoteUseCase() {
  const loteRepo = new PrismaLoteRepo();
  return new ModificarLote(loteRepo);
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

  const parsed = crearLoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearLoteRequest = {
    producto: parsed.data.producto,
    proveedorId: parsed.data.proveedorId,
    cantidadCompradaKg: String(parsed.data.cantidadCompradaKg),
    precioCompraBaseKg: String(parsed.data.precioCompraBaseKg),
    costoFlete: parsed.data.costoFlete ? String(parsed.data.costoFlete) : undefined,
    costoTajado: parsed.data.costoTajado ? String(parsed.data.costoTajado) : undefined,
    costoEmpaques: parsed.data.costoEmpaques ? String(parsed.data.costoEmpaques) : undefined,
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

export async function modificarLote(formData: FormData) {
  await requireSession();

  const parsed = actualizarLoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarLoteRequest = {
    id: parsed.data.id,
    version: parsed.data.version,
    precioCompraBaseKg: parsed.data.precioCompraBaseKg !== undefined ? String(parsed.data.precioCompraBaseKg) : undefined,
    cantidadCompradaKg: parsed.data.cantidadCompradaKg !== undefined ? String(parsed.data.cantidadCompradaKg) : undefined,
    costoFlete: parsed.data.costoFlete !== undefined ? String(parsed.data.costoFlete) : undefined,
    costoTajado: parsed.data.costoTajado !== undefined ? String(parsed.data.costoTajado) : undefined,
    costoEmpaques: parsed.data.costoEmpaques !== undefined ? String(parsed.data.costoEmpaques) : undefined,
  };

  try {
    const useCase = await getModificarLoteUseCase();
    const lote = await useCase.execute(request);
    revalidatePath('/lotes');
    return { success: true, lote: loteToResponse(lote) };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'El lote fue modificado por otro usuario. Recargue la página e intente de nuevo.',
      };
    }
    logger.error({ err: error }, 'Error modifying lote');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error modifying lote',
    };
  }
}

export async function eliminarLote(formData: FormData) {
  await requireSession();

  const id = formData.get('id') as string;

  try {
    const loteRepo = new PrismaLoteRepo();
    const lote = await loteRepo.findById(id);
    if (!lote) {
      return { success: false, error: 'Lote no encontrado' };
    }

    // Only allow delete if no stock has been sold (full stock remains)
    if (lote.stockDisponibleKg.value !== lote.cantidadCompradaKg.value) {
      return {
        success: false,
        error: 'No se puede eliminar un lote con ventas asociadas',
      };
    }

    await loteRepo.delete(id);
    revalidatePath('/lotes');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting lote');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting lote',
    };
  }
}

export async function getLotes() {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const lotes = await loteRepo.findAll();
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