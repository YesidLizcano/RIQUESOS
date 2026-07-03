'use server';

// Empaque Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaEmpaqueRepo } from '@/infrastructure/repositories/PrismaEmpaqueRepo';
import { RegistrarEmpaque } from '@/application/use-cases/RegistrarEmpaque';
import { ActualizarEmpaque } from '@/application/use-cases/ActualizarEmpaque';
import { crearEmpaqueSchema, actualizarEmpaqueSchema } from '@/presentation/validations/empaque.schema';
import type { CrearEmpaqueRequest, ActualizarEmpaqueRequest, EmpaqueResponse } from '../dtos';
import { handlePrismaError } from './utils';
import { recordAuditLog } from './audit-log';
import { logger } from '@/infrastructure/pino-logger';

async function getRegistrarEmpaqueUseCase() {
  const empaqueRepo = new PrismaEmpaqueRepo();
  return new RegistrarEmpaque(empaqueRepo);
}

async function getActualizarEmpaqueUseCase() {
  const empaqueRepo = new PrismaEmpaqueRepo();
  return new ActualizarEmpaque(empaqueRepo);
}

function empaqueToResponse(empaque: import('@/domain/entities/Empaque').Empaque): EmpaqueResponse {
  return {
    id: empaque.id,
    tipo: empaque.tipo,
    stock: empaque.stock,
    precio: empaque.precio.value,
    deletedAt: empaque.deletedAt?.toISOString() ?? null,
  };
}

export async function crearEmpaque(formData: FormData) {
  const session = await requireSession();

  const parsed = crearEmpaqueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearEmpaqueRequest = {
    tipo: parsed.data.tipo,
    stock: parsed.data.stock,
    precio: String(parsed.data.precio),
  };

  try {
    const useCase = await getRegistrarEmpaqueUseCase();
    const { empaque } = await useCase.execute(request);
    await recordAuditLog({ entityType: 'Empaque', entityId: empaque.id, action: 'CREATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/empaques');
    return { success: true, empaque: empaqueToResponse(empaque) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating empaque',
    };
  }
}

export async function actualizarEmpaque(formData: FormData) {
  const session = await requireSession();

  const parsed = actualizarEmpaqueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarEmpaqueRequest = {
    id: parsed.data.id,
    tipo: parsed.data.tipo,
    stock: parsed.data.stock,
    precio: parsed.data.precio !== undefined ? String(parsed.data.precio) : undefined,
  };

  try {
    const useCase = await getActualizarEmpaqueUseCase();
    const { empaque } = await useCase.execute(request);
    await recordAuditLog({ entityType: 'Empaque', entityId: empaque.id, action: 'UPDATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/empaques');
    return { success: true, empaque: empaqueToResponse(empaque) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating empaque',
    };
  }
}

export async function eliminarEmpaque(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    await empaqueRepo.softDelete(id);
    await recordAuditLog({ entityType: 'Empaque', entityId: id, action: 'DELETE', userId: (session.user as { id?: string }).id });
    revalidatePath('/empaques');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting empaque');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting empaque',
    };
  }
}

export async function restaurarEmpaque(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    await empaqueRepo.restore(id);
    await recordAuditLog({ entityType: 'Empaque', entityId: id, action: 'RESTORE', userId: (session.user as { id?: string }).id });
    revalidatePath('/empaques');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error restoring empaque',
    };
  }
}

export async function getEmpaques() {
  await requireSession();

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    const empaques = await empaqueRepo.findAll();
    return { success: true, empaques: empaques.map(empaqueToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching empaques');
    return { success: false, error: 'Error fetching empaques', empaques: [] };
  }
}

export async function getEmpaquesIncludeDeleted() {
  await requireSession();

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    const empaques = await empaqueRepo.findAllIncludeDeleted();
    return { success: true, empaques: empaques.map(empaqueToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching empaques including deleted');
    return { success: false, error: 'Error fetching empaques', empaques: [] };
  }
}