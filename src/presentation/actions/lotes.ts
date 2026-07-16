'use server';

// Lote Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { CrearLote } from '@/application/use-cases/CrearLote';
import { ModificarLote } from '@/application/use-cases/ModificarLote';
import { MarcarLotePagado } from '@/application/use-cases/MarcarLotePagado';
import { crearLoteSchema, actualizarLoteSchema, crearLotesBatchSchema } from '@/presentation/validations/lote.schema';
import { eliminarProveedorSchema } from '@/presentation/validations/proveedor.schema';
import type { CrearLoteRequest, ActualizarLoteRequest, LoteResponse } from '../dtos';
import { ConcurrencyError } from '@/domain/errors/ConcurrencyError';
import { MetodoPago, EstadoPagoLote as EstadoPagoLoteEnum } from '@/domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';
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
    precioPorBloqueEntero: lote.precioPorBloqueEntero.value,
    precioPorBloqueTajado: lote.precioPorBloqueTajado.value,
    costoFlete: lote.costoFlete.value,
    costoTajado: lote.costoTajado.value,
    costoEmpaques: lote.costoEmpaques.value,
    costoSeparadores: lote.costoSeparadores.value,
    costoRealCalculadoKg: lote.costoRealCalculadoKg.value,
    costoTajadoKg: lote.costoTajadoKg.value,
    costoTajadoFabricaKg: lote.costoTajadoFabricaKg.value,
    stockDisponibleKg: lote.stockDisponibleKg.value,
    bloquesEnteros: lote.bloquesEnteros,
    bloquesTajados: lote.bloquesTajados,
    bloquesTajadosDeFabrica: lote.bloquesTajadosDeFabrica,
    bloquesEnterosOriginal: lote.bloquesEnterosOriginal,
    bloquesTajadosFabricaOriginal: lote.bloquesTajadosFabricaOriginal,
    sueltosEntero: lote.sueltosEntero.value,
    sueltosTajado: lote.sueltosTajado.value,
    bloquesTajadosDisponibles: lote.bloquesTajados + lote.bloquesTajadosDeFabrica,
    estado: lote.estado,
    estadoPago: lote.estadoPago,
    metodoPagoLote: lote.metodoPagoLote,
    version: lote.version,
    deletedAt: lote.deletedAt?.toISOString() ?? null,
  };
}

export async function crearLote(formData: FormData) {
  const session = await requireSession();

  const parsed = crearLoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearLoteRequest = {
    producto: parsed.data.producto,
    proveedorId: parsed.data.proveedorId,
    precioCompraBaseKg: String(parsed.data.precioCompraBaseKg),
    precioPorBloqueEntero: parsed.data.precioPorBloqueEntero !== undefined ? String(parsed.data.precioPorBloqueEntero) : undefined,
    precioPorBloqueTajado: parsed.data.precioPorBloqueTajado !== undefined ? String(parsed.data.precioPorBloqueTajado) : undefined,
    costoFlete: parsed.data.costoFlete ? String(parsed.data.costoFlete) : undefined,
    costoEmpaques: parsed.data.costoEmpaques ? String(parsed.data.costoEmpaques) : undefined,
    estadoPago: parsed.data.estadoPago,
    metodoPagoLote: parsed.data.metodoPagoLote as MetodoPago,
    // For Doble Crema: bloques are provided, cantidadCompradaKg is calculated
    // For Semisalado: cantidadCompradaKg is provided directly
    ...(parsed.data.producto === 'DOBLE_CREMA'
      ? {
          bloquesEnteros: parsed.data.bloquesEnteros ?? 0,
          bloquesTajadosDeFabrica: parsed.data.bloquesTajadosDeFabrica ?? 0,
          cantidadCompradaKg: '0', // Will be calculated by the use case
        }
      : {
          cantidadCompradaKg: String(parsed.data.cantidadCompradaKg),
        }),
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
      error: error instanceof Error ? error.message : 'Error al crear lote',
    };
  }
}

export async function modificarLote(formData: FormData) {
  const session = await requireSession();

  const parsed = actualizarLoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarLoteRequest = {
    id: parsed.data.id,
    version: parsed.data.version,
    precioCompraBaseKg: parsed.data.precioCompraBaseKg !== undefined ? String(parsed.data.precioCompraBaseKg) : undefined,
    precioPorBloqueEntero: parsed.data.precioPorBloqueEntero !== undefined ? String(parsed.data.precioPorBloqueEntero) : undefined,
    precioPorBloqueTajado: parsed.data.precioPorBloqueTajado !== undefined ? String(parsed.data.precioPorBloqueTajado) : undefined,
    cantidadCompradaKg: parsed.data.cantidadCompradaKg !== undefined ? String(parsed.data.cantidadCompradaKg) : undefined,
    costoFlete: parsed.data.costoFlete !== undefined ? String(parsed.data.costoFlete) : undefined,
    costoEmpaques: parsed.data.costoEmpaques !== undefined ? String(parsed.data.costoEmpaques) : undefined,
    estadoPago: parsed.data.estadoPago,
    metodoPagoLote: parsed.data.metodoPagoLote as MetodoPago | undefined,
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
      error: error instanceof Error ? error.message : 'Error al modificar lote',
    };
  }
}

export async function eliminarLote(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const loteRepo = new PrismaLoteRepo();
    const lote = await loteRepo.findById(id);
    if (!lote) {
      return { success: false, error: 'Lote no encontrado' };
    }

    // Allow soft delete regardless of stock status.
    // The lote will be hidden from active lists but data remains for historical records.
    // Stock may still be non-zero — that's OK, the lote is just archived.
    await loteRepo.softDelete(id);

    revalidatePath('/lotes');
    revalidatePath('/ventas');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting lote');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar lote',
    };
  }
}

export async function restaurarLote(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const loteRepo = new PrismaLoteRepo();
    await loteRepo.restore(id);

    revalidatePath('/lotes');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring lote');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al restaurar lote',
    };
  }
}

export async function cerrarLote(formData: FormData) {
  await requireSession();

  const id = formData.get('id') as string;
  if (!id) {
    return { success: false, error: 'ID de lote requerido' };
  }

  try {
    const loteRepo = new PrismaLoteRepo();
    const lote = await loteRepo.findById(id);
    if (!lote) {
      return { success: false, error: 'Lote no encontrado' };
    }
    if (lote.deletedAt) {
      return { success: false, error: 'No se puede cerrar un lote eliminado' };
    }
    if (lote.estado === 'AGOTADO') {
      return { success: false, error: 'El lote ya está agotado' };
    }

    const closedLote = lote.cerrarLote();
    await loteRepo.cerrarLote(id, closedLote, lote.version);

    revalidatePath('/lotes');
    revalidatePath('/ventas');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'El lote fue modificado por otro usuario. Recargue la página e intente de nuevo.',
      };
    }
    logger.error({ err: error }, 'Error closing lote');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cerrar el lote',
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
    return { success: false, error: 'Error al obtener lotes', lotes: [] };
  }
}

export async function getLotesIncludeDeleted() {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const lotes = await loteRepo.findAllIncludeDeleted();
    return { success: true, lotes: lotes.map(loteToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching lotes including deleted');
    return { success: false, error: 'Error al obtener lotes', lotes: [] };
  }
}

export async function getLoteById(id: string) {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const lote = await loteRepo.findById(id);
    if (!lote) {
      return { success: false, error: 'Lote no encontrado' };
    }
    return { success: true, lote: loteToResponse(lote) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching lote');
    return { success: false, error: 'Error al obtener lote' };
  }
}

export async function pagarLote(formData: FormData) {
  await requireSession();
  const loteId = formData.get('id') as string;
  const metodoPago = formData.get('metodoPago') as string;

  const parsed = z.object({
    id: z.string().uuid(),
    metodoPago: z.enum(['EFECTIVO', 'NEQUI', 'BRE_B']),
  }).safeParse({ id: loteId, metodoPago });

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  try {
    const loteRepo = new PrismaLoteRepo();
    const useCase = new MarcarLotePagado(loteRepo);
    const result = await useCase.execute({ loteId: parsed.data.id, metodoPago: parsed.data.metodoPago });

    revalidatePath('/lotes');
    revalidatePath('/');
    logger.info({ loteId, metodoPago }, 'Lote pagado exitosamente');

    return { success: true, lote: loteToResponse(result.lote) };
  } catch (error) {
    logger.error({ err: error }, 'Error marking lote as paid');
    return { success: false, error: error instanceof Error ? error.message : 'Error al pagar lote' };
  }
}

/**
 * Calculate the weight of a single item for flete prorration.
 * SS items: weight = cantidadCompradaKg
 * DC items: weight = (bloquesEnteros + bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG
 */
function itemWeightKg(item: {
  producto: string;
  cantidadCompradaKg: number;
  bloquesEnteros: number;
  bloquesTajadosDeFabrica: number;
}): number {
  if (item.producto === 'DOBLE_CREMA') {
    return (item.bloquesEnteros + item.bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG;
  }
  return item.cantidadCompradaKg;
}

export async function crearLotes(payload: {
  proveedorId: string;
  costoFlete: string;
  estadoPago: string;
  metodoPagoLote: string;
  items: Array<{
    producto: string;
    cantidadCompradaKg?: string;
    precioCompraBaseKg?: string;
    bloquesEnteros?: number;
    bloquesTajadosDeFabrica?: number;
    precioPorBloqueEntero?: string;
    precioPorBloqueTajado?: string;
    costoFlete: string;
  }>;
}): Promise<{ success: boolean; error?: string; lotes?: LoteResponse[] }> {
  await requireSession();

  const parsed = crearLotesBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { proveedorId, costoFlete: costoFleteGlobal, estadoPago, metodoPagoLote, items } = parsed.data;

  // Calculate total weight for flete prorration
  const totalWeight = items.reduce((sum, item) => sum + itemWeightKg(item), 0);

  // Prorate flete per item based on weight
  const proratedItems = items.map((item) => {
    const weight = itemWeightKg(item);
    const proratedFlete = totalWeight > 0
      ? (weight / totalWeight) * costoFleteGlobal
      : 0;
    return {
      ...item,
      costoFlete: proratedFlete.toFixed(2),
    };
  });

  try {
    const useCase = await getCrearLoteUseCase();
    const createdLotes: LoteResponse[] = [];

    for (const item of proratedItems) {
      const request: CrearLoteRequest = {
        producto: item.producto,
        proveedorId,
        precioCompraBaseKg: String(item.precioCompraBaseKg ?? 0),
        precioPorBloqueEntero: item.precioPorBloqueEntero !== undefined ? String(item.precioPorBloqueEntero) : undefined,
        precioPorBloqueTajado: item.precioPorBloqueTajado !== undefined ? String(item.precioPorBloqueTajado) : undefined,
        costoFlete: item.costoFlete,
        estadoPago: estadoPago as EstadoPagoLoteEnum,
        metodoPagoLote: metodoPagoLote as MetodoPago,
        ...(item.producto === 'DOBLE_CREMA'
          ? {
              bloquesEnteros: item.bloquesEnteros ?? 0,
              bloquesTajadosDeFabrica: item.bloquesTajadosDeFabrica ?? 0,
              cantidadCompradaKg: '0', // Will be calculated by the use case
            }
          : {
              cantidadCompradaKg: String(item.cantidadCompradaKg),
            }),
      };

      const { lote } = await useCase.execute(request);
      createdLotes.push(loteToResponse(lote));
    }

    revalidatePath('/lotes');
    return { success: true, lotes: createdLotes };
  } catch (error) {
    logger.error({ err: error }, 'Error creating lotes batch');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear lotes',
    };
  }
}