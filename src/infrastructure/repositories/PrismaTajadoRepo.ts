// Infrastructure: PrismaTajadoRepo — persists Tajado entity via Prisma
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Tajado } from '../../domain/entities/Tajado';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';

export class PrismaTajadoRepo implements TajadoRepository {
  async save(tajado: Tajado): Promise<Tajado> {
    const data = {
      loteId: tajado.loteId,
      cantidadBloques: tajado.cantidadBloques,
      precioPorBloque: new Prisma.Decimal(tajado.precioPorBloque.value),
      tajador: tajado.tajador,
      costoTotal: new Prisma.Decimal(tajado.costoTotal.value),
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

  async findByLoteId(loteId: string): Promise<Tajado[]> {
    const records = await prisma.tajado.findMany({
      where: { loteId },
      orderBy: { fecha: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: Prisma.TajadoGetPayload<{}>): Tajado {
    return new Tajado({
      id: record.id,
      loteId: record.loteId,
      cantidadBloques: record.cantidadBloques,
      precioPorBloque: record.precioPorBloque.toString(),
      tajador: record.tajador,
      fecha: record.fecha,
    });
  }
}