'use server';

// GastoFijo Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaGastoFijoRepo } from '@/infrastructure/repositories/PrismaGastoFijoRepo';
import { GestionarGastos } from '@/application/use-cases/GestionarGastos';
import { crearGastoFijoSchema, actualizarGastoFijoSchema, eliminarGastoFijoSchema } from '@/presentation/validations/gasto-fijo.schema';
import type { CrearGastoRequest, ActualizarGastoRequest, GastoResponse, GastoMensualResumenResponse } from '../dtos';
import { handlePrismaError } from './utils';
import { logger } from '@/infrastructure/pino-logger';

async function getGestionarGastosUseCase() {
  const gastoRepo = new PrismaGastoFijoRepo();
  return new GestionarGastos(gastoRepo);
}

function gastoToResponse(gasto: import('@/domain/entities/GastoFijo').GastoFijo): GastoResponse {
  return {
    id: gasto.id,
    fecha: gasto.fecha.toISOString(),
    concepto: gasto.concepto,
    valor: gasto.valor.value,
  };
}

export async function crearGasto(formData: FormData) {
  await requireSession();

  const parsed = crearGastoFijoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearGastoRequest = {
    concepto: parsed.data.concepto,
    valor: String(parsed.data.valor),
  };

  try {
    const useCase = await getGestionarGastosUseCase();
    const gasto = await useCase.crear(request);
    revalidatePath('/gastos');
    return { success: true, gasto: gastoToResponse(gasto) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating gasto');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating gasto',
    };
  }
}

export async function actualizarGasto(formData: FormData) {
  await requireSession();

  const parsed = actualizarGastoFijoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarGastoRequest = {
    id: parsed.data.id,
    concepto: parsed.data.concepto || undefined,
    valor: parsed.data.valor !== undefined ? String(parsed.data.valor) : undefined,
  };

  try {
    const useCase = await getGestionarGastosUseCase();
    const gasto = await useCase.actualizar(request);
    revalidatePath('/gastos');
    return { success: true, gasto: gastoToResponse(gasto) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating gasto');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating gasto',
    };
  }
}

export async function eliminarGasto(formData: FormData) {
  await requireSession();

  const parsed = eliminarGastoFijoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarGastosUseCase();
    await useCase.eliminar(parsed.data.id);
    revalidatePath('/gastos');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting gasto');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting gasto',
    };
  }
}

export async function getGastos() {
  await requireSession();

  try {
    const useCase = await getGestionarGastosUseCase();
    const gastos = await useCase.obtenerTodos();
    return { success: true, gastos: gastos.map(gastoToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching gastos');
    return { success: false, error: 'Error fetching gastos', gastos: [] };
  }
}

export async function getResumenMensual(inicio: Date, fin: Date) {
  await requireSession();

  try {
    const useCase = await getGestionarGastosUseCase();
    const resumen = await useCase.resumenMensual(inicio, fin);
    const response: GastoMensualResumenResponse = {
      total: resumen.total,
      gastos: resumen.gastos.map(gastoToResponse),
    };
    return { success: true, resumen: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching resumen mensual');
    return { success: false, error: 'Error fetching resumen mensual' };
  }
}