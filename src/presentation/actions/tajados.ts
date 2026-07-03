'use server';

// Tajado Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaTajadoRepo } from '@/infrastructure/repositories/PrismaTajadoRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { RegistrarTajado } from '@/application/use-cases/RegistrarTajado';
import { crearTajadoSchema } from '@/presentation/validations/tajado.schema';
import { ConcurrencyError } from '@/domain/errors/ConcurrencyError';
import { handlePrismaError } from './utils';
import { recordAuditLog } from './audit-log';
import { logger } from '@/infrastructure/pino-logger';

async function getRegistrarTajadoUseCase() {
  const tajadoRepo = new PrismaTajadoRepo();
  const loteRepo = new PrismaLoteRepo();
  return new RegistrarTajado(tajadoRepo, loteRepo);
}

export async function registrarTajado(formData: FormData) {
  const session = await requireSession();

  const parsed = crearTajadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getRegistrarTajadoUseCase();
    const { tajado, lote } = await useCase.execute({
      loteId: parsed.data.loteId,
      cantidadBloques: parsed.data.cantidadBloques,
      precioPorBloque: String(parsed.data.precioPorBloque),
      tajador: parsed.data.tajador,
    });

    await recordAuditLog({
      entityType: 'Tajado',
      entityId: tajado.id,
      action: 'CREATE',
      userId: (session.user as { id?: string }).id,
    });

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
      error: error instanceof Error ? error.message : 'Error registering tajado',
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
        fecha: t.fecha.toISOString(),
      })),
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching tajados');
    return { success: false, error: 'Error fetching tajados', tajados: [] };
  }
}