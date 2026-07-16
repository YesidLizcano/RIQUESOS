'use server';

// CompraInsumo Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaCompraInsumoRepo } from '@/infrastructure/repositories/PrismaCompraInsumoRepo';
import { PrismaEmpaqueRepo } from '@/infrastructure/repositories/PrismaEmpaqueRepo';
import { RegistrarCompraInsumo } from '@/application/use-cases/RegistrarCompraInsumo';
import { registrarCompraSchema } from '@/presentation/validations/compra-insumo.schema';
import { CategoriaInsumo } from '@/domain/enums';
import type { RegistrarCompraRequest, CompraInsumoResponse } from '../dtos/compra-insumo.dto';
import { handlePrismaError } from './utils';

import { logger } from '@/infrastructure/pino-logger';
import { prisma } from '@/infrastructure/db';

async function getRegistrarCompraUseCase() {
  const compraRepo = new PrismaCompraInsumoRepo();
  const empaqueRepo = new PrismaEmpaqueRepo();
  return new RegistrarCompraInsumo(compraRepo, empaqueRepo);
}

function compraToResponse(compra: import('@/domain/entities/CompraInsumo').CompraInsumo, empaqueTipo?: string): CompraInsumoResponse {
  return {
    id: compra.id,
    empaqueId: compra.empaqueId,
    categoria: compra.categoria,
    cantidad: compra.cantidad.value,
    cantidadRestante: compra.cantidadRestante.value,
    precioUnitario: compra.precioUnitario.value,
    costoTotal: compra.costoTotal.value,
    fecha: compra.fecha.toISOString(),
    empaqueTipo,
  };
}

export async function registrarCompraInsumo(formData: FormData) {
  const session = await requireSession();

  const parsed = registrarCompraSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: RegistrarCompraRequest = {
    empaqueId: parsed.data.empaqueId,
    cantidad: String(parsed.data.cantidad),
    precioUnitario: String(parsed.data.precioUnitario),
  };

  try {
    const useCase = await getRegistrarCompraUseCase();
    const { compra } = await useCase.execute(request);

    revalidatePath('/insumos');
    return { success: true, compra: compraToResponse(compra) };
  } catch (error) {
    logger.error({ err: error }, 'Error registering compra insumo');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: prismaError };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error registrando compra de insumo',
    };
  }
}

export async function getComprasInsumo() {
  await requireSession();

  try {
    const records = await prisma.compraInsumo.findMany({
      orderBy: { fecha: 'desc' },
      include: { empaque: true },
    });
      const compras: CompraInsumoResponse[] = records.map((r) => ({
      id: r.id,
      empaqueId: r.empaqueId,
      categoria: r.categoria as CategoriaInsumo,
      cantidad: r.cantidad.toString(),
      cantidadRestante: r.cantidadRestante.toString(),
      precioUnitario: r.precioUnitario.toString(),
      costoTotal: r.costoTotal.toString(),
      fecha: r.fecha.toISOString(),
      empaqueTipo: r.empaque?.tipo,
    }));
    return { success: true, compras };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching compras insumo');
    return { success: false, error: 'Error al obtener compras', compras: [] };
  }
}

export async function getComprasInsumoByDateRange(month: number, year: number) {
  await requireSession();

  try {
    if (month === -1) {
      // "Todos" — return all compras without date filter
      const inicio = new Date(2000, 0, 1);
      const fin = new Date(2100, 11, 31, 23, 59, 59, 999);
      const allCompras = await prisma.compraInsumo.findMany({
        where: {
          fecha: { gte: inicio, lte: fin },
        },
        orderBy: { fecha: 'desc' },
        include: { empaque: true },
      });
      const compras: CompraInsumoResponse[] = allCompras.map((r) => ({
        id: r.id,
        empaqueId: r.empaqueId,
        categoria: r.categoria as CategoriaInsumo,
        cantidad: r.cantidad.toString(),
        cantidadRestante: r.cantidadRestante.toString(),
        precioUnitario: r.precioUnitario.toString(),
        costoTotal: r.costoTotal.toString(),
        fecha: r.fecha.toISOString(),
        empaqueTipo: r.empaque?.tipo,
      }));
      return { success: true, compras };
    }

    const inicio = new Date(year, month, 1);
    const fin = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const records = await prisma.compraInsumo.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      orderBy: { fecha: 'desc' },
      include: { empaque: true },
    });
    const compras: CompraInsumoResponse[] = records.map((r) => ({
      id: r.id,
      empaqueId: r.empaqueId,
      categoria: r.categoria as CategoriaInsumo,
      cantidad: r.cantidad.toString(),
      cantidadRestante: r.cantidadRestante.toString(),
      precioUnitario: r.precioUnitario.toString(),
      costoTotal: r.costoTotal.toString(),
      fecha: r.fecha.toISOString(),
      empaqueTipo: r.empaque?.tipo,
    }));
    return { success: true, compras };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching compras insumo by date range');
    return { success: false, error: 'Error al obtener compras', compras: [] };
  }
}