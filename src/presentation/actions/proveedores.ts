'use server';

// Proveedor Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { GestionarProveedores } from '@/application/use-cases/GestionarProveedores';
import { crearProveedorSchema, actualizarProveedorSchema, eliminarProveedorSchema } from '@/presentation/validations/proveedor.schema';
import type { CrearProveedorRequest, ActualizarProveedorRequest, ProveedorResponse } from '../dtos';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { Dinero } from '@/domain/value-objects/Dinero';
import { loteToResponse } from './utils';
import type { LotesByProveedorResponse } from '@/presentation/dtos';
import { handlePrismaError } from './utils';

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

    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating proveedor');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un proveedor con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear proveedor',
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

    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating proveedor');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un proveedor con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar proveedor',
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
      error: error instanceof Error ? error.message : 'Error al eliminar proveedor',
    };
  }
}

export async function restaurarProveedor(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.restaurar(id);

    revalidatePath('/proveedores');
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring proveedor');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe un proveedor activo con ese nombre' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al restaurar proveedor',
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
    return { success: false, error: 'Error al obtener proveedores', proveedores: [] };
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
    return { success: false, error: 'Error al obtener proveedores', proveedores: [] };
  }
}

export async function getProveedorById(id: string) {
  await requireSession();

  try {
    const useCase = await getGestionarProveedoresUseCase();
    const proveedor = await useCase.obtenerPorId(id);
    if (!proveedor) {
      return { success: false, error: 'Proveedor no encontrado' };
    }
    return { success: true, proveedor: proveedorToResponse(proveedor) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching proveedor');
    return { success: false, error: 'Error al obtener proveedor' };
  }
}

export async function getLotesByProveedor(proveedorId: string): Promise<{ success: boolean; data?: LotesByProveedorResponse; error?: string }> {
  await requireSession();

  try {
    const proveedorRepo = new PrismaProveedorRepo();
    const loteRepo = new PrismaLoteRepo();

    const proveedor = await proveedorRepo.findById(proveedorId);
    if (!proveedor) {
      return { success: false, error: 'Proveedor no encontrado' };
    }

    const lotes = await loteRepo.findByProveedor(proveedorId);
    const lotesResponse = lotes.map(loteToResponse);

    let totalCosto = new Dinero('0');
    let montoPendienteTotal = new Dinero('0');
    let lotesPagados = 0;
    let lotesPendientes = 0;

    for (const lote of lotes) {
      const costoLote = lote.precioCompraBaseKg.multiply(lote.cantidadCompradaKg.value).add(lote.costoFlete);
      totalCosto = totalCosto.add(costoLote);

      if (lote.estadoPago === 'PAGADO') {
        lotesPagados++;
      } else {
        lotesPendientes++;
        montoPendienteTotal = montoPendienteTotal.add(costoLote);
      }
    }

    return {
      success: true,
      data: {
        lotes: lotesResponse,
        proveedorNombre: proveedor.nombre,
        totalLotes: lotes.length,
        totalCosto: totalCosto.value,
        lotesPagados,
        lotesPendientes,
        montoPendienteTotal: montoPendienteTotal.value,
      },
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching lotes by proveedor');
    return { success: false, error: 'Error al obtener lotes del proveedor' };
  }
}