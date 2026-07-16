// Infrastructure: PrismaClienteRepo — implements ClienteRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Cliente } from '../../domain/entities/Cliente';
import { TipoCliente } from '../../domain/enums';
import { asTipoCliente } from '../../domain/mappers';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export class PrismaClienteRepo implements ClienteRepository {
  async findById(id: string): Promise<Cliente | null> {
    const record = await prisma.cliente.findUnique({ where: { id, deletedAt: null } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Cliente[]> {
    if (ids.length === 0) return [];
    // Include deleted records for FK resolution (e.g., Venta resolving Cliente names)
    const records = await prisma.cliente.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Cliente[]> {
    const records = await prisma.cliente.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findActiveByNombre(nombre: string): Promise<Cliente | null> {
    const record = await prisma.cliente.findFirst({
      where: { nombre, deletedAt: null },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async save(cliente: Cliente): Promise<Cliente> {
    const data = {
      nombre: cliente.nombre,
      tipo: cliente.tipo as TipoCliente,
      precioDobleCremaEntero: cliente.precioDobleCremaEntero
        ? new Prisma.Decimal(cliente.precioDobleCremaEntero.value)
        : null,
      precioDobleCremaTajado: cliente.precioDobleCremaTajado
        ? new Prisma.Decimal(cliente.precioDobleCremaTajado.value)
        : null,
      precioSemisalado: cliente.precioSemisalado
        ? new Prisma.Decimal(cliente.precioSemisalado.value)
        : null,
      valorDomicilio: new Prisma.Decimal(cliente.valorDomicilio.value),
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

  async softDelete(id: string): Promise<void> {
    await prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.cliente.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findDeleted(): Promise<Cliente[]> {
    const records = await prisma.cliente.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: Prisma.ClienteGetPayload<{}>): Cliente {
    return new Cliente({
      id: record.id,
      nombre: record.nombre,
      tipo: asTipoCliente(record.tipo),
      precioDobleCremaEntero: record.precioDobleCremaEntero?.toString() ?? undefined,
      precioDobleCremaTajado: record.precioDobleCremaTajado?.toString() ?? undefined,
      precioSemisalado: record.precioSemisalado?.toString() ?? undefined,
      valorDomicilio: record.valorDomicilio?.toString() ?? '0',
      deletedAt: record.deletedAt,
    });
  }
}