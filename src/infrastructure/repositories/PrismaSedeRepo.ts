// Infrastructure: PrismaSedeRepo — implements SedeRepository port
import { prisma } from '../db';
import { Sede } from '../../domain/entities/Sede';
import type { SedeRepository } from '../../domain/ports/SedeRepository';

export class PrismaSedeRepo implements SedeRepository {
  async findById(id: string): Promise<Sede | null> {
    const record = await prisma.sede.findUnique({ where: { id, deletedAt: null } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Sede[]> {
    if (ids.length === 0) return [];
    const records = await prisma.sede.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByClienteId(clienteId: string): Promise<Sede[]> {
    const records = await prisma.sede.findMany({
      where: { clienteId, deletedAt: null },
      orderBy: [{ esPrincipal: 'desc' }, { nombre: 'asc' }],
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Sede[]> {
    const records = await prisma.sede.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
    });
    return records.map((r) => this.toEntity(r));
  }

  async findActive(): Promise<Sede[]> {
    return this.findAll();
  }

  async save(sede: Sede): Promise<Sede> {
    const data = {
      nombre: sede.nombre,
      direccion: sede.direccion,
      telefono: sede.telefono,
      esPrincipal: sede.esPrincipal,
      clienteId: sede.clienteId,
    };

    if (sede.id) {
      const updated = await prisma.sede.update({
        where: { id: sede.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.sede.create({ data });
    return this.toEntity(created);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.sede.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.sede.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private toEntity(record: {
    id: string;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    esPrincipal: boolean;
    clienteId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Sede {
    return new Sede({
      id: record.id,
      nombre: record.nombre,
      direccion: record.direccion ?? undefined,
      telefono: record.telefono ?? undefined,
      esPrincipal: record.esPrincipal,
      clienteId: record.clienteId,
      deletedAt: record.deletedAt,
    });
  }
}