// Infrastructure: PrismaCompraInsumoRepo — implements CompraInsumoRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { CompraInsumo, type CategoriaInsumo } from '../../domain/entities/CompraInsumo';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';

export class PrismaCompraInsumoRepo implements CompraInsumoRepository {
  async save(compra: CompraInsumo): Promise<CompraInsumo> {
    const data = {
      empaqueId: compra.empaqueId,
      categoria: compra.categoria,
      cantidad: new Prisma.Decimal(compra.cantidad.value),
      cantidadRestante: new Prisma.Decimal(compra.cantidadRestante.value),
      precioUnitario: new Prisma.Decimal(compra.precioUnitario.value),
      costoTotal: new Prisma.Decimal(compra.costoTotal.value),
    };

    if (compra.id) {
      const updated = await prisma.compraInsumo.update({
        where: { id: compra.id },
        data,
        include: { empaque: true },
      });
      return this.toEntity(updated);
    }

    const created = await prisma.compraInsumo.create({
      data,
      include: { empaque: true },
    });
    return this.toEntity(created);
  }

  async update(compra: CompraInsumo): Promise<CompraInsumo> {
    const updated = await prisma.compraInsumo.update({
      where: { id: compra.id },
      data: {
        cantidadRestante: new Prisma.Decimal(compra.cantidadRestante.value),
      },
      include: { empaque: true },
    });
    return this.toEntity(updated);
  }

  async findByDateRange(inicio: Date, fin: Date): Promise<CompraInsumo[]> {
    const records = await prisma.compraInsumo.findMany({
      where: {
        fecha: {
          gte: inicio,
          lte: fin,
        },
      },
      orderBy: { fecha: 'desc' },
      include: { empaque: true },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<CompraInsumo[]> {
    const records = await prisma.compraInsumo.findMany({
      orderBy: { fecha: 'desc' },
      include: { empaque: true },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByEmpaqueId(empaqueId: string): Promise<CompraInsumo[]> {
    const records = await prisma.compraInsumo.findMany({
      where: { empaqueId },
      orderBy: { fecha: 'asc' },
      include: { empaque: true },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findActiveByEmpaqueId(empaqueId: string): Promise<CompraInsumo[]> {
    const records = await prisma.compraInsumo.findMany({
      where: {
        empaqueId,
        cantidadRestante: { gt: 0 },
      },
      orderBy: { fecha: 'asc' },
      include: { empaque: true },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    empaqueId: string;
    categoria: string;
    cantidad: { toString(): string };
    cantidadRestante: { toString(): string };
    precioUnitario: { toString(): string };
    costoTotal: { toString(): string };
    fecha: Date;
    empaque?: { tipo: string } | null;
  }): CompraInsumo {
    return new CompraInsumo({
      id: record.id,
      empaqueId: record.empaqueId,
      categoria: record.categoria as CategoriaInsumo,
      cantidad: record.cantidad.toString(),
      cantidadRestante: record.cantidadRestante.toString(),
      precioUnitario: record.precioUnitario.toString(),
      costoTotal: record.costoTotal.toString(),
      fecha: record.fecha,
    });
  }
}