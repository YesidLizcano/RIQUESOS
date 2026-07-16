// Infrastructure: PrismaEmpaqueRepo — implements EmpaqueRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Empaque, type CategoriaInsumo } from '../../domain/entities/Empaque';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export class PrismaEmpaqueRepo implements EmpaqueRepository {
  async save(empaque: Empaque): Promise<Empaque> {
    const data = {
      tipo: empaque.tipo,
      categoria: empaque.categoria,
      stock: new Prisma.Decimal(empaque.stock.value),
      precio: new Prisma.Decimal(empaque.precio.value),
    };

    if (empaque.id) {
      const updated = await prisma.empaque.update({
        where: { id: empaque.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.empaque.create({ data });
    return this.toEntity(created);
  }

  async findById(id: string): Promise<Empaque | null> {
    const record = await prisma.empaque.findUnique({ where: { id, deletedAt: null } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<Empaque[]> {
    const records = await prisma.empaque.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByCategoria(categoria: CategoriaInsumo): Promise<Empaque[]> {
    const records = await prisma.empaque.findMany({
      where: { categoria, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async update(id: string, empaque: Empaque): Promise<Empaque> {
    const updated = await prisma.empaque.update({
      where: { id },
      data: {
        tipo: empaque.tipo,
        categoria: empaque.categoria,
        stock: new Prisma.Decimal(empaque.stock.value),
        precio: new Prisma.Decimal(empaque.precio.value),
      },
    });
    return this.toEntity(updated);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.empaque.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.empaque.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findAllIncludeDeleted(): Promise<Empaque[]> {
    const records = await prisma.empaque.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    tipo: string;
    categoria: string;
    stock: { toString(): string };
    precio: { toString(): string };
    deletedAt: Date | null;
  }): Empaque {
    return new Empaque({
      id: record.id,
      tipo: record.tipo,
      categoria: record.categoria as CategoriaInsumo,
      stock: record.stock.toString(),
      precio: record.precio.toString(),
      deletedAt: record.deletedAt,
    });
  }
}