// Infrastructure: PrismaClienteRepo — implements ClienteRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Cliente } from '../../domain/entities/Cliente';
import { TipoCliente } from '../../domain/enums';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export class PrismaClienteRepo implements ClienteRepository {
  async findById(id: string): Promise<Cliente | null> {
    const record = await prisma.cliente.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Cliente[]> {
    if (ids.length === 0) return [];
    const records = await prisma.cliente.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Cliente[]> {
    const records = await prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(cliente: Cliente): Promise<Cliente> {
    const data = {
      nombre: cliente.nombre,
      tipo: cliente.tipo as TipoCliente,
      precioDobleCrema: cliente.precioDobleCrema
        ? new Prisma.Decimal(cliente.precioDobleCrema.value)
        : null,
      precioSemisalado: cliente.precioSemisalado
        ? new Prisma.Decimal(cliente.precioSemisalado.value)
        : null,
    };

    if (cliente.id) {
      const updated = await prisma.cliente.update({
        where: { id: cliente.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.cliente.create({ data });
    return this.toEntity(created);
  }

  async delete(id: string): Promise<void> {
    await prisma.cliente.delete({ where: { id } });
  }

  private toEntity(record: Prisma.ClienteGetPayload<{}>): Cliente {
    return new Cliente({
      id: record.id,
      nombre: record.nombre,
      tipo: record.tipo as string as TipoCliente,
      precioDobleCrema: record.precioDobleCrema?.toString() ?? undefined,
      precioSemisalado: record.precioSemisalado?.toString() ?? undefined,
    });
  }
}