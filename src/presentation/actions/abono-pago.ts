'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaAbonoPagoRepo } from '@/infrastructure/repositories/PrismaAbonoPagoRepo';
import { RegistrarAbonoPago } from '@/application/use-cases/RegistrarAbonoPago';
import { prisma } from '@/infrastructure/db';
import { logger } from '@/infrastructure/pino-logger';
import type { AbonoPagoResponse } from '../dtos/abono-pago.dto';
import { registrarAbonoPagoSchema } from '../validations/abono-pago.schema';

function abonoPagoToResponse(abono: {
  id: string;
  ventaId: string;
  monto: { toString(): string };
  metodoPago: string;
  observacion: string | null;
  fecha: Date;
}): AbonoPagoResponse {
  return {
    id: abono.id,
    ventaId: abono.ventaId,
    monto: abono.monto.toString(),
    metodoPago: abono.metodoPago,
    observacion: abono.observacion ?? null,
    fecha: abono.fecha.toISOString(),
  };
}

export async function registrarAbonoPago(input: {
  ventaId: string;
  monto: string;
  metodoPago: string;
  observacion?: string;
}) {
  await requireSession();

  try {
    const parsed = registrarAbonoPagoSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos';
      return { success: false, error: firstError };
    }

    const ventaRepo = new PrismaVentaRepo();
    const abonoPagoRepo = new PrismaAbonoPagoRepo();
    const useCase = new RegistrarAbonoPago(ventaRepo, abonoPagoRepo);

    const result = await useCase.execute({
      ventaId: parsed.data.ventaId,
      monto: String(parsed.data.monto),
      metodoPago: parsed.data.metodoPago,
      observacion: parsed.data.observacion,
    });

    revalidatePath('/ventas');
    logger.info({ ventaId: input.ventaId, monto: input.monto }, 'AbonoPago registered successfully');

    return {
      success: true,
      abono: abonoPagoToResponse({
        id: result.abono.id,
        ventaId: result.abono.ventaId,
        monto: result.abono.monto,
        metodoPago: result.abono.metodoPago,
        observacion: result.abono.observacion || null,
        fecha: result.abono.fecha,
      }),
      saldoRestante: result.saldoRestante,
    };
  } catch (error) {
    logger.warn({ err: error }, 'AbonoPago registration failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar abono',
    };
  }
}

export async function getAbonosByVenta(ventaId: string) {
  await requireSession();

  try {
    const records = await prisma.abonoPago.findMany({
      where: { ventaId },
      orderBy: { fecha: 'asc' },
    });
    return { success: true, abonos: records.map(abonoPagoToResponse) };
  } catch (error) {
    return { success: true, abonos: [] };
  }
}