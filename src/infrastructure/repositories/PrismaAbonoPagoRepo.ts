import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AbonoPago } from '../../domain/entities/AbonoPago';
import type { AbonoPagoRepository } from '../../domain/ports/AbonoPagoRepository';

export class PrismaAbonoPagoRepo implements AbonoPagoRepository {
  async save(abono: AbonoPago): Promise<AbonoPago> {
    const created = await prisma.abonoPago.create({
      data: {
        ventaId: abono.ventaId,
        monto: new Prisma.Decimal(abono.monto.value),
        metodoPago: abono.metodoPago,
        observacion: abono.observacion || null,
        fecha: abono.fecha,
      },
    });
    return this.toEntity(created);
  }

  async findByVentaId(ventaId: string): Promise<AbonoPago[]> {
    const records = await prisma.abonoPago.findMany({
      where: { ventaId },
      orderBy: { fecha: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    ventaId: string;
    monto: { toString(): string };
    metodoPago: string;
    observacion: string | null;
    fecha: Date;
  }): AbonoPago {
    return new AbonoPago({
      id: record.id,
      ventaId: record.ventaId,
      monto: record.monto.toString(),
      metodoPago: record.metodoPago,
      observacion: record.observacion ?? undefined,
      fecha: record.fecha,
    });
  }
}