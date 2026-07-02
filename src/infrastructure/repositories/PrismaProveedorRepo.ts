// Infrastructure: PrismaProveedorRepo — implements ProveedorRepository port
import { prisma } from '../db';
import { Proveedor } from '../../domain/entities/Proveedor';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export class PrismaProveedorRepo implements ProveedorRepository {
  async findById(id: string): Promise<Proveedor | null> {
    const record = await prisma.proveedor.findUnique({ where: { id, deletedAt: null } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Proveedor[]> {
    if (ids.length === 0) return [];
    // Include deleted records for FK resolution (e.g., Lote resolving Proveedor name)
    const records = await prisma.proveedor.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Proveedor[]> {
    const records = await prisma.proveedor.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(proveedor: Proveedor): Promise<Proveedor> {
    const data = {
      nombre: proveedor.nombre,
      telefono: proveedor.telefono,
    };

    if (proveedor.id) {
      const updated = await prisma.proveedor.update({
        where: { id: proveedor.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.proveedor.create({ data });
    return this.toEntity(created);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.proveedor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.proveedor.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findDeleted(): Promise<Proveedor[]> {
    const records = await prisma.proveedor.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    nombre: string;
    telefono: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Proveedor {
    return new Proveedor({
      id: record.id,
      nombre: record.nombre,
      telefono: record.telefono ?? undefined,
      deletedAt: record.deletedAt,
    });
  }
}