// Infrastructure: PrismaLoteRepo — optimistic locking with version field
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Lote } from '../../domain/entities/Lote';
import { EstadoLote, TipoProducto, EstadoPagoLote, MetodoPago } from '../../domain/enums';
import { asTipoProducto, asEstadoLote, asEstadoPagoLote } from '../../domain/mappers';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export class PrismaLoteRepo implements LoteRepository {
  async findById(id: string): Promise<Lote | null> {
    const record = await prisma.lote.findUnique({ where: { id, deletedAt: null } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByIds(ids: string[]): Promise<Lote[]> {
    if (ids.length === 0) return [];
    const records = await prisma.lote.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findActive(): Promise<Lote[]> {
    const records = await prisma.lote.findMany({
      where: { estado: EstadoLote.ACTIVO, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<Lote[]> {
    const records = await prisma.lote.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByProveedor(proveedorId: string): Promise<Lote[]> {
    const records = await prisma.lote.findMany({
      where: { proveedorId, deletedAt: null },
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
       precioPorBloqueEntero: new Prisma.Decimal(lote.precioPorBloqueEntero.value),
       precioPorBloqueTajado: new Prisma.Decimal(lote.precioPorBloqueTajado.value),
       costoFlete: new Prisma.Decimal(lote.costoFlete.value),
      costoTajado: new Prisma.Decimal(lote.costoTajado.value),
      costoEmpaques: new Prisma.Decimal(lote.costoEmpaques.value),
      costoSeparadores: new Prisma.Decimal(lote.costoSeparadores.value),
      costoRealCalculadoKg: new Prisma.Decimal(lote.costoRealCalculadoKg.value),
      stockDisponibleKg: new Prisma.Decimal(lote.stockDisponibleKg.value),
      bloquesEnteros: lote.bloquesEnteros,
      bloquesTajados: lote.bloquesTajados,
      bloquesTajadosDeFabrica: lote.bloquesTajadosDeFabrica,
       bloquesEnterosOriginal: lote.bloquesEnterosOriginal,
       bloquesTajadosFabricaOriginal: lote.bloquesTajadosFabricaOriginal,
       bloquesTajadosAcumulados: lote.bloquesTajadosAcumulados,
        sueltosEntero: new Prisma.Decimal(lote.sueltosEntero.value),
        sueltosTajado: new Prisma.Decimal(lote.sueltosTajado.value),
        estado: lote.estado as EstadoLote,
       estadoPago: lote.estadoPago as EstadoPagoLote,
       metodoPagoLote: lote.metodoPagoLote as MetodoPago,
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
    const newEstado = newStock.isZero() && (current.producto !== 'RECORTES_DOBLE_CREMA') ? EstadoLote.AGOTADO : asEstadoLote(current.estado);

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

  /**
   * Accumulate recortes kg into the permanent lot with optimistic locking.
   * Increments both stockDisponibleKg and cantidadCompradaKg by the given amount.
   */
  async acumularRecortes(id: string, recortesKg: string, expectedVersion: number): Promise<Lote> {
    const result = await prisma.lote.updateMany({
      where: { id, version: expectedVersion },
      data: {
        stockDisponibleKg: { increment: new Prisma.Decimal(recortesKg) },
        cantidadCompradaKg: { increment: new Prisma.Decimal(recortesKg) },
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyError(`Lote ${id} was modified by another transaction`);
    }
    const updated = await prisma.lote.findUnique({ where: { id } });
    if (!updated) throw new Error(`Lote not found after update: ${id}`);
    return this.toEntity(updated);
  }

  /**
   * Update cost fields with optimistic locking.
   * Uses updateMany with version check to detect concurrent modifications.
   * Returns updated Lote or throws ConcurrencyError if version mismatch.
   */
  async updateCosts(id: string, lote: Lote, expectedVersion: number): Promise<Lote> {
    const result = await prisma.lote.updateMany({
      where: { id, version: expectedVersion },
      data: {
          precioCompraBaseKg: new Prisma.Decimal(lote.precioCompraBaseKg.value),
          precioPorBloqueEntero: new Prisma.Decimal(lote.precioPorBloqueEntero.value),
          precioPorBloqueTajado: new Prisma.Decimal(lote.precioPorBloqueTajado.value),
          cantidadCompradaKg: new Prisma.Decimal(lote.cantidadCompradaKg.value),
         costoFlete: new Prisma.Decimal(lote.costoFlete.value),
         costoTajado: new Prisma.Decimal(lote.costoTajado.value),
         costoEmpaques: new Prisma.Decimal(lote.costoEmpaques.value),
         costoSeparadores: new Prisma.Decimal(lote.costoSeparadores.value),
          costoRealCalculadoKg: new Prisma.Decimal(lote.costoRealCalculadoKg.value),
          estadoPago: lote.estadoPago as EstadoPagoLote,
          metodoPagoLote: lote.metodoPagoLote as MetodoPago,
          version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConcurrencyError(
        `Lote ${id} was modified by another transaction (expected version ${expectedVersion})`
      );
    }

    const updated = await prisma.lote.findUnique({ where: { id } });
    if (!updated) {
      throw new Error(`Lote not found after update: ${id}`);
    }
    return this.toEntity(updated);
  }

  /**
   * Update block fields and cost fields with optimistic locking.
   * Used by RegistrarTajado to update bloquesEnteros, bloquesTajados, costoTajado, and costoRealCalculadoKg.
   */
  async updateBlocks(id: string, lote: Lote, expectedVersion: number): Promise<Lote> {
    const result = await prisma.lote.updateMany({
      where: { id, version: expectedVersion },
      data: {
        bloquesEnteros: lote.bloquesEnteros,
        bloquesTajados: lote.bloquesTajados,
       sueltosEntero: new Prisma.Decimal(lote.sueltosEntero.value),
       sueltosTajado: new Prisma.Decimal(lote.sueltosTajado.value),
        costoTajado: new Prisma.Decimal(lote.costoTajado.value),
        costoSeparadores: new Prisma.Decimal(lote.costoSeparadores.value),
        costoRealCalculadoKg: new Prisma.Decimal(lote.costoRealCalculadoKg.value),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConcurrencyError(
        `Lote ${id} was modified by another transaction (expected version ${expectedVersion})`
      );
    }

    const updated = await prisma.lote.findUnique({ where: { id } });
    if (!updated) {
      throw new Error(`Lote not found after update: ${id}`);
    }
    return this.toEntity(updated);
  }

  async cerrarLote(id: string, lote: Lote, expectedVersion: number): Promise<Lote> {
    const result = await prisma.lote.updateMany({
      where: { id, version: expectedVersion },
      data: {
        estado: lote.estado as EstadoLote,
        stockDisponibleKg: new Prisma.Decimal(lote.stockDisponibleKg.value),
        bloquesEnteros: lote.bloquesEnteros,
        bloquesTajados: lote.bloquesTajados,
        bloquesTajadosDeFabrica: lote.bloquesTajadosDeFabrica,
        bloquesTajadosAcumulados: lote.bloquesTajadosAcumulados,
        sueltosEntero: new Prisma.Decimal(lote.sueltosEntero.value),
        sueltosTajado: new Prisma.Decimal(lote.sueltosTajado.value),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyError(`Lote ${id} was modified by another transaction`);
    }
    const updated = await prisma.lote.findUnique({ where: { id } });
    if (!updated) throw new Error(`Lote not found after close: ${id}`);
    return this.toEntity(updated);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.lote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.lote.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findAllIncludeDeleted(): Promise<Lote[]> {
    // No deletedAt filter — returns both active and deleted records
    const records = await prisma.lote.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async sumCostoPendientePago(): Promise<{ total: string; count: number }> {
    const records = await prisma.lote.findMany({
      where: {
        estadoPago: EstadoPagoLote.PENDIENTE,
        deletedAt: null,
      },
    });

    const lotes = records.map((r) => this.toEntity(r));
    let total = new Prisma.Decimal(0);

    for (const lote of lotes) {
      total = total.add(new Prisma.Decimal(lote.costoTotalLote.value));
    }

    return { total: total.toString(), count: lotes.length };
  }

  private toEntity(record: Prisma.LoteGetPayload<{}>): Lote {
    return new Lote({
      id: record.id,
      producto: asTipoProducto(record.producto),
      fechaIngreso: record.fechaIngreso,
      proveedorId: record.proveedorId,
      cantidadCompradaKg: record.cantidadCompradaKg.toString(),
      precioCompraBaseKg: record.precioCompraBaseKg.toString(),
       precioPorBloqueEntero: record.precioPorBloqueEntero.toString(),
       precioPorBloqueTajado: (record.precioPorBloqueTajado ?? record.precioPorBloqueEntero).toString(),
      costoFlete: record.costoFlete.toString(),
      costoTajado: record.costoTajado.toString(),
      costoEmpaques: record.costoEmpaques.toString(),
      costoSeparadores: record.costoSeparadores.toString(),
      stockDisponibleKg: record.stockDisponibleKg.toString(),
      bloquesEnteros: record.bloquesEnteros,
      bloquesTajados: record.bloquesTajados,
      bloquesTajadosDeFabrica: record.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: record.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: record.bloquesTajadosFabricaOriginal,
      bloquesTajadosAcumulados: record.bloquesTajadosAcumulados,
      sueltosEntero: record.sueltosEntero.toString(),
      sueltosTajado: record.sueltosTajado.toString(),
      estado: asEstadoLote(record.estado),
      estadoPago: asEstadoPagoLote(record.estadoPago),
      metodoPagoLote: record.metodoPagoLote as MetodoPago,
      version: record.version,
      deletedAt: record.deletedAt,
    });
  }
}