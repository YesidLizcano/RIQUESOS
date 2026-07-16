import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { PrecioClienteProveedor } from '../../domain/entities/PrecioClienteProveedor';
import type { PrecioClienteProveedorRepository } from '../../domain/ports/PrecioClienteProveedorRepository';

export class PrismaPrecioClienteProveedorRepo implements PrecioClienteProveedorRepository {
  async findByClienteAndProveedor(clienteId: string, proveedorId: string): Promise<PrecioClienteProveedor | null> {
    const record = await prisma.precioClienteProveedor.findUnique({
      where: { clienteId_proveedorId: { clienteId, proveedorId } },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByCliente(clienteId: string): Promise<PrecioClienteProveedor[]> {
    const records = await prisma.precioClienteProveedor.findMany({
      where: { clienteId },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor> {
    const created = await prisma.precioClienteProveedor.create({
      data: {
        clienteId: precio.clienteId,
        proveedorId: precio.proveedorId,
        precioEntero: new Prisma.Decimal(precio.precioEntero.value),
        precioTajado: new Prisma.Decimal(precio.precioTajado.value),
        valorDomicilio: new Prisma.Decimal(precio.valorDomicilio.value),
        costoDomiciliario: new Prisma.Decimal(precio.costoDomiciliario.value),
      },
    });
    return this.toEntity(created);
  }

  async update(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor> {
    const updated = await prisma.precioClienteProveedor.update({
      where: { id: precio.id },
      data: {
        precioEntero: new Prisma.Decimal(precio.precioEntero.value),
        precioTajado: new Prisma.Decimal(precio.precioTajado.value),
        valorDomicilio: new Prisma.Decimal(precio.valorDomicilio.value),
        costoDomiciliario: new Prisma.Decimal(precio.costoDomiciliario.value),
      },
    });
    return this.toEntity(updated);
  }

  async upsert(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor> {
    const result = await prisma.precioClienteProveedor.upsert({
      where: { clienteId_proveedorId: { clienteId: precio.clienteId, proveedorId: precio.proveedorId } },
      update: {
        precioEntero: new Prisma.Decimal(precio.precioEntero.value),
        precioTajado: new Prisma.Decimal(precio.precioTajado.value),
        valorDomicilio: new Prisma.Decimal(precio.valorDomicilio.value),
        costoDomiciliario: new Prisma.Decimal(precio.costoDomiciliario.value),
      },
      create: {
        clienteId: precio.clienteId,
        proveedorId: precio.proveedorId,
        precioEntero: new Prisma.Decimal(precio.precioEntero.value),
        precioTajado: new Prisma.Decimal(precio.precioTajado.value),
        valorDomicilio: new Prisma.Decimal(precio.valorDomicilio.value),
        costoDomiciliario: new Prisma.Decimal(precio.costoDomiciliario.value),
      },
    });
    return this.toEntity(result);
  }

  private toEntity(record: {
    id: string;
    clienteId: string;
    proveedorId: string;
    precioEntero: { toString(): string };
    precioTajado: { toString(): string };
    valorDomicilio: { toString(): string };
    costoDomiciliario: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  }): PrecioClienteProveedor {
    return new PrecioClienteProveedor({
      id: record.id,
      clienteId: record.clienteId,
      proveedorId: record.proveedorId,
      precioEntero: record.precioEntero.toString(),
      precioTajado: record.precioTajado.toString(),
      valorDomicilio: record.valorDomicilio.toString(),
      costoDomiciliario: record.costoDomiciliario.toString(),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}