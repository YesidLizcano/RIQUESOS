// Infrastructure: PrismaProveedorRepo — implements ProveedorRepository port
import { prisma } from '../db';
import { Proveedor } from '../../domain/entities/Proveedor';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export class PrismaProveedorRepo implements ProveedorRepository {
  async findById(id: string): Promise<Proveedor | null> {
    const record = await prisma.proveedor.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<Proveedor[]> {
    const records = await prisma.proveedor.findMany({
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

  async delete(id: string): Promise<void> {
    await prisma.proveedor.delete({ where: { id } });
  }

  private toEntity(record: {
    id: string;
    nombre: string;
    telefono: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Proveedor {
    return new Proveedor({
      id: record.id,
      nombre: record.nombre,
      telefono: record.telefono ?? undefined,
    });
  }
}