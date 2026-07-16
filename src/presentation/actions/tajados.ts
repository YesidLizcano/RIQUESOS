'use server';

// Tajado Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaTajadoRepo } from '@/infrastructure/repositories/PrismaTajadoRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaEmpaqueRepo } from '@/infrastructure/repositories/PrismaEmpaqueRepo';
import { PrismaCompraInsumoRepo } from '@/infrastructure/repositories/PrismaCompraInsumoRepo';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { RegistrarTajado } from '@/application/use-cases/RegistrarTajado';
import { MarcarTajadoPagado } from '@/application/use-cases/MarcarTajadoPagado';
import { crearTajadoSchema } from '@/presentation/validations/tajado.schema';
import { ConcurrencyError } from '@/domain/errors/ConcurrencyError';
import { handlePrismaError } from './utils';

import { logger } from '@/infrastructure/pino-logger';

async function getRegistrarTajadoUseCase() {
  const tajadoRepo = new PrismaTajadoRepo();
  const loteRepo = new PrismaLoteRepo();
  const empaqueRepo = new PrismaEmpaqueRepo();
  const compraInsumoRepo = new PrismaCompraInsumoRepo();
  return new RegistrarTajado(tajadoRepo, loteRepo, empaqueRepo, compraInsumoRepo);
}

export async function registrarTajado(formData: FormData) {
  const session = await requireSession();

  const parsed = crearTajadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getRegistrarTajadoUseCase();
    const { tajado, lote, recortesLote } = await useCase.execute({
      loteId: parsed.data.loteId,
      cantidadBloques: parsed.data.cantidadBloques,
      precioPorBloque: String(parsed.data.precioPorBloque),
      tajador: parsed.data.tajador,
      separadoresKg: String(parsed.data.separadoresKg),
      recortesKg: String(parsed.data.recortesKg ?? 0),
    });



    revalidatePath('/lotes');
    revalidatePath('/insumos');
    return {
      success: true,
      tajado: {
        id: tajado.id,
        loteId: tajado.loteId,
        cantidadBloques: tajado.cantidadBloques,
        precioPorBloque: tajado.precioPorBloque.value,
        tajador: tajado.tajador,
        costoTotal: tajado.costoTotal.value,
        separadoresKg: tajado.separadoresKg.value,
        costoSeparadores: tajado.costoSeparadores.value,
        recortesKg: tajado.recortesKg.value,
        estadoPago: tajado.estadoPago,
        fecha: tajado.fecha.toISOString(),
      },
      lote: {
        id: lote.id,
        bloquesEnteros: lote.bloquesEnteros,
        bloquesTajados: lote.bloquesTajados,
        costoTajado: lote.costoTajado.value,
        costoRealCalculadoKg: lote.costoRealCalculadoKg.value,
      },
    };
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return {
        success: false,
        error: 'El lote fue modificado por otro usuario. Recargue la página e intente de nuevo.',
      };
    }
    logger.error({ err: error }, 'Error registering tajado');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar tajado',
    };
  }
}

export async function getTajadosByLoteId(loteId: string) {
  await requireSession();

  try {
    const tajadoRepo = new PrismaTajadoRepo();
    const tajados = await tajadoRepo.findByLoteId(loteId);
    return {
      success: true,
      tajados: tajados.map((t) => ({
        id: t.id,
        loteId: t.loteId,
        cantidadBloques: t.cantidadBloques,
        precioPorBloque: t.precioPorBloque.value,
        tajador: t.tajador,
        costoTotal: t.costoTotal.value,
        separadoresKg: t.separadoresKg.value,
        costoSeparadores: t.costoSeparadores.value,
        recortesKg: t.recortesKg.value,
        estadoPago: t.estadoPago,
        fecha: t.fecha.toISOString(),
      })),
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tajados');
    return { success: false, error: 'Error al obtener tajados', tajados: [] };
  }
}

export async function getTajados(inicio?: string, fin?: string) {
  await requireSession();

  try {
    const tajadoRepo = new PrismaTajadoRepo();
    const loteRepo = new PrismaLoteRepo();
    const proveedorRepo = new PrismaProveedorRepo();

    let tajados = await tajadoRepo.findAll();

    // Filter by date range if provided
    if (inicio || fin) {
      const inicioDate = inicio ? new Date(inicio + 'T00:00:00') : new Date(0);
      const finDate = fin ? new Date(fin + 'T23:59:59.999') : new Date('9999-12-31');
      tajados = tajados.filter((t) => {
        return t.fecha >= inicioDate && t.fecha <= finDate;
      });
    }

    // Collect unique lote IDs and resolve lote + proveedor info
    const loteIds = [...new Set(tajados.map((t) => t.loteId))];
    const lotes = loteIds.length > 0 ? await loteRepo.findByIds(loteIds) : [];
    const loteMap = new Map(lotes.map((l) => [l.id, l]));

    const proveedorIds = [...new Set(lotes.map((l) => l.proveedorId))];
    const proveedores = proveedorIds.length > 0 ? await proveedorRepo.findByIds(proveedorIds) : [];
    const proveedorMap = new Map(proveedores.map((p) => [p.id, p.nombre]));

    return {
      success: true,
      tajados: tajados.map((t) => {
        const lote = loteMap.get(t.loteId);
        const loteInfo = lote
          ? {
              producto: lote.producto,
              proveedor: proveedorMap.get(lote.proveedorId) ?? 'Desconocido',
            }
          : undefined;
        return {
          id: t.id,
          loteId: t.loteId,
          loteInfo,
          cantidadBloques: t.cantidadBloques,
          precioPorBloque: t.precioPorBloque.value,
          tajador: t.tajador,
          costoTotal: t.costoTotal.value,
          separadoresKg: t.separadoresKg.value,
          costoSeparadores: t.costoSeparadores.value,
          recortesKg: t.recortesKg.value,
          estadoPago: t.estadoPago,
          fecha: t.fecha.toISOString(),
        };
      }),
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tajados historial');
    return { success: false, error: 'Error al obtener tajados', tajados: [] };
  }
}

export async function marcarTajadoPagado(id: string) {
  await requireSession();

  try {
    const tajadoRepo = new PrismaTajadoRepo();
    const useCase = new MarcarTajadoPagado(tajadoRepo);
    const tajado = await useCase.execute(id);

    revalidatePath('/tajados');
    revalidatePath('/lotes');
    return {
      success: true,
      tajado: {
        id: tajado.id,
        loteId: tajado.loteId,
        cantidadBloques: tajado.cantidadBloques,
        precioPorBloque: tajado.precioPorBloque.value,
        tajador: tajado.tajador,
        costoTotal: tajado.costoTotal.value,
        separadoresKg: tajado.separadoresKg.value,
        costoSeparadores: tajado.costoSeparadores.value,
        recortesKg: tajado.recortesKg.value,
        estadoPago: tajado.estadoPago,
        fecha: tajado.fecha.toISOString(),
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Error marking tajado as pagado');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar tajado como pagado',
    };
  }
}