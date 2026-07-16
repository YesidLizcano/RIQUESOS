// Infrastructure: PrismaTajadoRepo — persists Tajado entity via Prisma
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Tajado } from '../../domain/entities/Tajado';
import { ESTADO_PAGO_TAJADO } from '../../domain/enums';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';

export class PrismaTajadoRepo implements TajadoRepository {
  async save(tajado: Tajado): Promise<Tajado> {
    const data = {
      loteId: tajado.loteId,
      cantidadBloques: tajado.cantidadBloques,
      precioPorBloque: new Prisma.Decimal(tajado.precioPorBloque.value),
      tajador: tajado.tajador,
      costoTotal: new Prisma.Decimal(tajado.costoTotal.value),
      separadoresKg: new Prisma.Decimal(tajado.separadoresKg.value),
      costoSeparadores: new Prisma.Decimal(tajado.costoSeparadores.value),
      recortesKg: new Prisma.Decimal(tajado.recortesKg.value),
      estadoPago: tajado.estadoPago,
      fecha: tajado.fecha,
    };

    if (tajado.id) {
      const updated = await prisma.tajado.update({
        where: { id: tajado.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.tajado.create({ data });
    return this.toEntity(created);
  }

  async findById(id: string): Promise<Tajado | null> {
    const record = await prisma.tajado.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByLoteId(loteId: string): Promise<Tajado[]> {
    const records = await prisma.tajado.findMany({
      where: { loteId },
      orderBy: { fecha: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Tajado[]> {
    const records = await prisma.tajado.findMany({
      orderBy: { fecha: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async updateEstadoPago(id: string, estadoPago: string): Promise<Tajado> {
    const updated = await prisma.tajado.update({
      where: { id },
      data: { estadoPago },
    });
    return this.toEntity(updated);
  }

  async sumPendientePago(): Promise<string> {
    const result = await prisma.tajado.aggregate({
      _sum: { costoTotal: true },
      where: { estadoPago: ESTADO_PAGO_TAJADO.PENDIENTE },
    });
    const total = result._sum.costoTotal;
    return total ? total.toString() : '0';
  }

  private toEntity(record: Prisma.TajadoGetPayload<{}>): Tajado {
    return new Tajado({
      id: record.id,
      loteId: record.loteId,
      cantidadBloques: record.cantidadBloques,
      precioPorBloque: record.precioPorBloque.toString(),
      tajador: record.tajador,
      separadoresKg: record.separadoresKg.toString(),
      costoSeparadores: record.costoSeparadores.toString(),
      recortesKg: record.recortesKg.toString(),
      estadoPago: record.estadoPago as typeof ESTADO_PAGO_TAJADO.PENDIENTE | typeof ESTADO_PAGO_TAJADO.PAGADO,
      fecha: record.fecha,
    });
  }
}