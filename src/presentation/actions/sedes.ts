'use server';

// Sede Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaSedeRepo } from '@/infrastructure/repositories/PrismaSedeRepo';
import { GestionarSedes } from '@/application/use-cases/GestionarSedes';
import { crearSedeSchema, actualizarSedeSchema } from '@/presentation/validations/sede.schema';
import type { SedeResponse } from '@/presentation/dtos';
import { handlePrismaError } from './utils';
import { logger } from '@/infrastructure/pino-logger';

async function getGestionarSedesUseCase() {
  const sedeRepo = new PrismaSedeRepo();
  return new GestionarSedes(sedeRepo);
}

function sedeToResponse(sede: import('@/domain/entities/Sede').Sede): SedeResponse {
  return {
    id: sede.id,
    nombre: sede.nombre,
    direccion: sede.direccion,
    telefono: sede.telefono,
    esPrincipal: sede.esPrincipal,
    clienteId: sede.clienteId,
    deletedAt: sede.deletedAt?.toISOString() ?? null,
  };
}

export async function crearSede(input: { nombre: string; direccion?: string; telefono?: string; esPrincipal?: boolean; clienteId: string }) {
  await requireSession();

  const parsed = crearSedeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarSedesUseCase();
    const sede = await useCase.crear(parsed.data);
    revalidatePath('/clientes');
    return { success: true, sede: sedeToResponse(sede) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating sede');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe una sede con ese nombre para este cliente' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear sede',
    };
  }
}

export async function actualizarSede(input: { id: string; nombre?: string; direccion?: string; telefono?: string; esPrincipal?: boolean }) {
  await requireSession();

  const parsed = actualizarSedeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarSedesUseCase();
    const sede = await useCase.actualizar(parsed.data);
    revalidatePath('/clientes');
    return { success: true, sede: sedeToResponse(sede) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating sede');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'Ya existe una sede con ese nombre para este cliente' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar sede',
    };
  }
}

export async function eliminarSede(id: string) {
  await requireSession();

  try {
    const useCase = await getGestionarSedesUseCase();
    await useCase.eliminar(id);
    revalidatePath('/clientes');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting sede');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar sede',
    };
  }
}

export async function obtenerSedesPorCliente(clienteId: string) {
  await requireSession();

  try {
    const useCase = await getGestionarSedesUseCase();
    const sedes = await useCase.obtenerPorClienteId(clienteId);
    return { success: true, sedes: sedes.map(sedeToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching sedes by cliente');
    return { success: false, error: 'Error al obtener sedes', sedes: [] };
  }
}

export async function obtenerSedes() {
  await requireSession();

  try {
    const useCase = await getGestionarSedesUseCase();
    const sedes = await useCase.obtenerTodos();
    return { success: true, sedes: sedes.map(sedeToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching sedes');
    return { success: false, error: 'Error al obtener sedes', sedes: [] };
  }
}