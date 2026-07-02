'use server';

// Proveedor Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { GestionarProveedores } from '@/application/use-cases/GestionarProveedores';
import { crearProveedorSchema } from '@/presentation/validations/proveedor.schema';
import type { CrearProveedorRequest, ProveedorResponse } from '../dtos';
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
  };
}

export async function crearProveedor(formData: FormData) {
  await requireSession();

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