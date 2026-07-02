// Infrastructure: PrismaGastoFijoRepo — implements GastoFijoRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { GastoFijo } from '../../domain/entities/GastoFijo';
import type { GastoFijoRepository } from '../../domain/ports/GastoFijoRepository';

export class PrismaGastoFijoRepo implements GastoFijoRepository {
  async findById(id: string): Promise<GastoFijo | null> {
    const record = await prisma.gastoFijo.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<GastoFijo[]> {
    const records = await prisma.gastoFijo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(gasto: GastoFijo): Promise<GastoFijo> {
    const data = {
      concepto: gasto.concepto,
      valor: new Prisma.Decimal(gasto.valor.value),
    };

    if (gasto.id) {
      const updated = await prisma.gastoFijo.update({
        where: { id: gasto.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.gastoFijo.create({ data });
    return this.toEntity(created);
  }

  async delete(id: string): Promise<void> {
    await prisma.gastoFijo.delete({ where: { id } });
  }

  async findByDateRange(inicio: Date, fin: Date): Promise<GastoFijo[]> {
    const records = await prisma.gastoFijo.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async sumByPeriod(inicio: Date, fin: Date): Promise<string> {
    const result = await prisma.gastoFijo.aggregate({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      _sum: { valor: true },
    });
    return (result._sum.valor ?? new Prisma.Decimal(0)).toString();
  }

  private toEntity(record: Prisma.GastoFijoGetPayload<{}>): GastoFijo {
    return new GastoFijo({
      id: record.id,
      fecha: record.fecha,
      concepto: record.concepto,
      valor: record.valor.toString(),
    });
  }
}