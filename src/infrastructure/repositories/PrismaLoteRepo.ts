// Infrastructure: PrismaLoteRepo — optimistic locking with version field
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Lote } from '../../domain/entities/Lote';
import { EstadoLote, TipoProducto } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export class PrismaLoteRepo implements LoteRepository {
  async findById(id: string): Promise<Lote | null> {
    const record = await prisma.lote.findUnique({ where: { id } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findActive(): Promise<Lote[]> {
    const records = await prisma.lote.findMany({
      where: { estado: EstadoLote.ACTIVO },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByProveedor(proveedorId: string): Promise<Lote[]> {
    const records = await prisma.lote.findMany({
      where: { proveedorId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(lote: Lote): Promise<Lote> {
    const data = {
      producto: lote.producto as TipoProducto,
      proveedorId: lote.proveedorId,
      cantidadCompradaKg: new Prisma.Decimal(lote.cantidadCompradaKg.value),
      precioCompraBaseKg: new Prisma.Decimal(lote.precioCompraBaseKg.value),
      costoFlete: new Prisma.Decimal(lote.costoFlete.value),
      costoTajado: new Prisma.Decimal(lote.costoTajado.value),
      costoEmpaques: new Prisma.Decimal(lote.costoEmpaques.value),
      costoRealCalculadoKg: new Prisma.Decimal(lote.costoRealCalculadoKg.value),
      stockDisponibleKg: new Prisma.Decimal(lote.stockDisponibleKg.value),
      estado: lote.estado as EstadoLote,
    };

    if (lote.id) {
      const updated = await prisma.lote.update({
        where: { id: lote.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.lote.create({ data });
    return this.toEntity(created);
  }

  /**
   * Deduct stock with optimistic locking.
   * Checks the version field to detect concurrent modifications.
   * If version mismatches, throws ConcurrencyError.
   * Automatically transitions to AGOTADO when stock reaches zero.
   */
  async deductStock(id: string, cantidadKg: string, expectedVersion: number): Promise<Lote> {
    const cantidad = new Prisma.Decimal(cantidadKg);

    // Verify the lote exists and has sufficient stock
    const current = await prisma.lote.findUnique({ where: { id } });
    if (!current) {
      throw new Error(`Lote not found: ${id}`);
    }

    // Check if stock would go negative
    const currentStock = new Prisma.Decimal(current.stockDisponibleKg);
    if (currentStock.lessThan(cantidad)) {
      throw new Error(
        `Insufficient stock: available ${currentStock.toString()} Kg, requested ${cantidadKg} Kg`
      );
    }

    const newStock = currentStock.minus(cantidad);
    const newEstado = newStock.isZero() ? EstadoLote.AGOTADO : current.estado as string as EstadoLote;

    // Optimistic locking: updateMany with version check
    const result = await prisma.lote.updateMany({
      where: { id, version: expectedVersion },
      data: {
        stockDisponibleKg: newStock,
        estado: newEstado,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConcurrencyError(
        `Lote ${id} was modified by another transaction (expected version ${expectedVersion})`
      );
    }

    // Fetch the updated lote
    const updated = await prisma.lote.findUnique({ where: { id } });
    if (!updated) {
      throw new Error(`Lote not found after update: ${id}`);
    }
    return this.toEntity(updated);
  }

  private toEntity(record: Prisma.LoteGetPayload<{}>): Lote {
    return new Lote({
      id: record.id,
      producto: record.producto as string as TipoProducto,
      fechaIngreso: record.fechaIngreso,
      proveedorId: record.proveedorId,
      cantidadCompradaKg: record.cantidadCompradaKg.toString(),
      precioCompraBaseKg: record.precioCompraBaseKg.toString(),
      costoFlete: record.costoFlete.toString(),
      costoTajado: record.costoTajado.toString(),
      costoEmpaques: record.costoEmpaques.toString(),
      stockDisponibleKg: record.stockDisponibleKg.toString(),
      estado: record.estado as string as EstadoLote,
      version: record.version,
    });
  }
}