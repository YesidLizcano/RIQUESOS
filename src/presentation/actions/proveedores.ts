'use server';

// Proveedor Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { GestionarProveedores } from '@/application/use-cases/GestionarProveedores';
import { crearProveedorSchema, actualizarProveedorSchema, eliminarProveedorSchema } from '@/presentation/validations/proveedor.schema';
import type { CrearProveedorRequest, ActualizarProveedorRequest, ProveedorResponse } from '../dtos';
import { handlePrismaError } from './utils';
import { recordAuditLog } from './audit-log';
import { logger } from '@/infrastructure/pino-logger';

async function getGestionarProveedoresUseCase() {
  const proveedorRepo = new PrismaProveedorRepo();
  return new GestionarProveedores(proveedorRepo);
}

function proveedorToResponse(proveedor: import('@/domain/entities/Proveedor').Proveedor): ProveedorResponse {
  return {
    id: proveedor.id,
    nombre: proveedor.nombre,
    telefono: proveedor.telefono,
    deletedAt: proveedor.deletedAt?.toISOString() ?? null,
  };
}

export async function crearProveedor(formData: FormData) {
  const session = await requireSession();

  const parsed = crearProveedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearProveedorRequest = {
    nombre: parsed.data.nombre,
    telefono: parsed.data.telefono || undefined,
  };

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.crear(request);
    await recordAuditLog({ entityType: 'Proveedor', entityId: proveedor.id, action: 'CREATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating proveedor');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating proveedor',
    };
  }
}

export async function actualizarProveedor(formData: FormData) {
  const session = await requireSession();

  const parsed = actualizarProveedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarProveedorRequest = {
    id: parsed.data.id,
    nombre: parsed.data.nombre || undefined,
    telefono: parsed.data.telefono || undefined,
  };

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.actualizar(request);
    await recordAuditLog({ entityType: 'Proveedor', entityId: proveedor.id, action: 'UPDATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating proveedor');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating proveedor',
    };
  }
}

export async function eliminarProveedor(formData: FormData) {
  const session = await requireSession();

  const parsed = eliminarProveedorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarProveedoresUseCase();
    await useCase.eliminar(parsed.data.id);
    await recordAuditLog({ entityType: 'Proveedor', entityId: parsed.data.id, action: 'DELETE', userId: (session.user as { id?: string }).id });
    revalidatePath('/proveedores');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting proveedor');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting proveedor',
    };
  }
}

export async function restaurarProveedor(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.restaurar(id);
    await recordAuditLog({ entityType: 'Proveedor', entityId: id, action: 'RESTORE', userId: (session.user as { id?: string }).id });
    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring proveedor');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error restoring proveedor',
    };
  }
}

export async function getProveedores() {
  await requireSession();

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedores = await useCase.obtenerTodos();
    return { success: true, proveedores: proveedores.map(proveedorToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching proveedores');
    return { success: false, error: 'Error fetching proveedores', proveedores: [] };
  }
}

export async function getProveedoresIncludeDeleted() {
  await requireSession();

  try {
    const proveedorRepo = new PrismaProveedorRepo();
    const deletedProveedores = await proveedorRepo.findDeleted();
    const activeResult = await getProveedores();
    const active = activeResult.success && activeResult.proveedores ? activeResult.proveedores : [];
    return { success: true, proveedores: [...active, ...deletedProveedores.map(proveedorToResponse)] };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching proveedores including deleted');
    return { success: false, error: 'Error fetching proveedores', proveedores: [] };
  }
}

export async function getProveedorById(id: string) {
  await requireSession();

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.obtenerPorId(id);
    if (!proveedor) {
      return { success: false, error: 'Proveedor not found' };
    }
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching proveedor');
    return { success: false, error: 'Error fetching proveedor' };
  }
}