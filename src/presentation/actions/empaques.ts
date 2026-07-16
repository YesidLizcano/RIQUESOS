'use server';

// Empaque Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaEmpaqueRepo } from '@/infrastructure/repositories/PrismaEmpaqueRepo';
import { PrismaCompraInsumoRepo } from '@/infrastructure/repositories/PrismaCompraInsumoRepo';
import { RegistrarEmpaque } from '@/application/use-cases/RegistrarEmpaque';
import { ActualizarEmpaque } from '@/application/use-cases/ActualizarEmpaque';
import { crearEmpaqueSchema, actualizarEmpaqueSchema } from '@/presentation/validations/empaque.schema';
import type { CrearEmpaqueRequest, ActualizarEmpaqueRequest, EmpaqueResponse } from '../dtos';
import { CategoriaInsumo } from '@/domain/enums';
import { handlePrismaError } from './utils';

import { logger } from '@/infrastructure/pino-logger';
import { prisma } from '@/infrastructure/db';

async function getRegistrarEmpaqueUseCase() {
  const empaqueRepo = new PrismaEmpaqueRepo();
  const compraRepo = new PrismaCompraInsumoRepo();
  return new RegistrarEmpaque(empaqueRepo, compraRepo);
}

async function getActualizarEmpaqueUseCase() {
  const empaqueRepo = new PrismaEmpaqueRepo();
  return new ActualizarEmpaque(empaqueRepo);
}

function empaqueToResponse(empaque: import('@/domain/entities/Empaque').Empaque): EmpaqueResponse {
  return {
    id: empaque.id,
    tipo: empaque.tipo,
    categoria: empaque.categoria,
    stock: empaque.stock.value,
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
    categoria: parsed.data.categoria,
    stock: String(parsed.data.stock),
    precio: String(parsed.data.precio),
  };

  try {
    const useCase = await getRegistrarEmpaqueUseCase();
    const { empaque } = await useCase.execute(request);

    revalidatePath('/insumos');
    return { success: true, empaque: empaqueToResponse(empaque) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear empaque',
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
    categoria: parsed.data.categoria,
    stock: parsed.data.stock !== undefined ? String(parsed.data.stock) : undefined,
    precio: parsed.data.precio !== undefined ? String(parsed.data.precio) : undefined,
  };

  try {
    const useCase = await getActualizarEmpaqueUseCase();
    const { empaque } = await useCase.execute(request);

    revalidatePath('/insumos');
    return { success: true, empaque: empaqueToResponse(empaque) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar empaque',
    };
  }
}

export async function eliminarEmpaque(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    await empaqueRepo.softDelete(id);

    revalidatePath('/insumos');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting empaque');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar empaque',
    };
  }
}

export async function restaurarEmpaque(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const empaqueRepo = new PrismaEmpaqueRepo();
    await empaqueRepo.restore(id);

    revalidatePath('/insumos');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring empaque');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al restaurar empaque',
    };
  }
}

export async function getEmpaques() {
  await requireSession();

  try {
    const records = await prisma.empaque.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { compras: true } },
        compras: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true },
        },
      },
    });
    const empaques: EmpaqueResponse[] = records.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      categoria: r.categoria as CategoriaInsumo,
      stock: r.stock.toString(),
      precio: r.precio.toString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      comprasCount: r._count.compras,
      lastCompraDate: r.compras[0]?.fecha?.toISOString() ?? null,
    }));
    return { success: true, empaques };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching empaques');
    return { success: false, error: 'Error al obtener empaques', empaques: [] };
  }
}

export async function getEmpaquesIncludeDeleted() {
  await requireSession();

  try {
    const records = await prisma.empaque.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { compras: true } },
        compras: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true },
        },
      },
    });
    const empaques: EmpaqueResponse[] = records.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      categoria: r.categoria as CategoriaInsumo,
      stock: r.stock.toString(),
      precio: r.precio.toString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
      comprasCount: r._count.compras,
      lastCompraDate: r.compras[0]?.fecha?.toISOString() ?? null,
    }));
    return { success: true, empaques };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching empaques including deleted');
    return { success: false, error: 'Error al obtener empaques', empaques: [] };
  }
}