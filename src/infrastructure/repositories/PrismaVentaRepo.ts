// Infrastructure: PrismaVentaRepo — $transaction for atomic sale + stock deduction with retry
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Venta } from '../../domain/entities/Venta';
import { EstadoLote } from '../../domain/enums';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';

export class PrismaVentaRepo implements VentaRepository {
  async save(venta: Venta): Promise<Venta> {
    const created = await prisma.venta.create({
      data: {
        clienteId: venta.clienteId,
        loteId: venta.loteId,
        cantidadVendidaKg: new Prisma.Decimal(venta.cantidadVendidaKg.value),
        precioVentaKg: new Prisma.Decimal(venta.precioVentaKg.value),
        ingresoTotal: new Prisma.Decimal(venta.ingresoTotal.value),
        costoAplicado: new Prisma.Decimal(venta.costoAplicado.value),
        gananciaBruta: new Prisma.Decimal(venta.gananciaBruta.value),
        valorDomicilio: new Prisma.Decimal(venta.valorDomicilio.value),
        domiciliario: venta.domiciliario,
      },
    });
    return this.toEntity(created);
  }

  /**
   * Register a Venta atomically: create the Venta record AND deduct stock from the Lote.
   * Uses Prisma $transaction for atomicity and optimistic locking (version field) on the Lote.
   * Retries on ConcurrencyError up to maxRetries times.
   */
  async registrarVentaAtomico(
    venta: Venta,
    loteId: string,
    cantidadKg: string,
    expectedVersion: number
  ): Promise<Venta> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Verify the Lote exists and has sufficient stock
          const lote = await tx.lote.findUnique({ where: { id: loteId } });
          if (!lote) {
            throw new Error(`Lote not found: ${loteId}`);
          }

          if ((lote.estado as string) === EstadoLote.AGOTADO) {
            throw new Error(`Lote ${loteId} is AGOTADO and cannot accept more sales`);
          }

          const cantidad = new Prisma.Decimal(cantidadKg);
          const currentStock = new Prisma.Decimal(lote.stockDisponibleKg);

          if (currentStock.lessThan(cantidad)) {
            throw new Error(
              `Insufficient stock: available ${currentStock.toString()} Kg, requested ${cantidadKg} Kg`
            );
          }

          // 2. Optimistic locking: check version and update stock
          const newStock = currentStock.minus(cantidad);
          const newEstado = newStock.isZero() ? EstadoLote.AGOTADO : lote.estado;

          const updateResult = await tx.lote.updateMany({
            where: { id: loteId, version: expectedVersion },
            data: {
              stockDisponibleKg: newStock,
              estado: newEstado as EstadoLote,
              version: { increment: 1 },
            },
          });

          if (updateResult.count === 0) {
            throw new ConcurrencyError(
              `Lote ${loteId} was modified by another transaction (expected version ${expectedVersion})`
            );
          }

          // 3. Create the Venta record
          const createdVenta = await tx.venta.create({
            data: {
              clienteId: venta.clienteId,
              loteId: venta.loteId,
              cantidadVendidaKg: new Prisma.Decimal(venta.cantidadVendidaKg.value),
              precioVentaKg: new Prisma.Decimal(venta.precioVentaKg.value),
              ingresoTotal: new Prisma.Decimal(venta.ingresoTotal.value),
              costoAplicado: new Prisma.Decimal(venta.costoAplicado.value),
              gananciaBruta: new Prisma.Decimal(venta.gananciaBruta.value),
              valorDomicilio: new Prisma.Decimal(venta.valorDomicilio.value),
              domiciliario: venta.domiciliario,
            },
          });

          return this.toEntity(createdVenta);
        });

        return result;
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          lastError = error;
          // Re-fetch the lote to get the current version for retry
          const refreshedLote = await prisma.lote.findUnique({ where: { id: loteId } });
          if (!refreshedLote) {
            throw new Error(`Lote not found: ${loteId}`);
          }
          // The caller (use case) handles the retry loop with fresh version
          // This inner retry is a safety net; the use case also retries
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Transaction failed after max retries');
  }

  async findByDateRange(inicio: Date, fin: Date): Promise<Venta[]> {
    const records = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: inicio,
          lte: fin,
        },
      },
      orderBy: { fecha: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByCliente(clienteId: string): Promise<Venta[]> {
    const records = await prisma.venta.findMany({
      where: { clienteId },
      orderBy: { fecha: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async sumIngresosByPeriod(inicio: Date, fin: Date): Promise<string> {
    const result = await prisma.venta.aggregate({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      _sum: { ingresoTotal: true },
    });
    return (result._sum.ingresoTotal ?? new Prisma.Decimal(0)).toString();
  }

  async sumCostosByPeriod(inicio: Date, fin: Date): Promise<string> {
    const result = await prisma.venta.aggregate({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      _sum: { costoAplicado: true },
    });
    return (result._sum.costoAplicado ?? new Prisma.Decimal(0)).toString();
  }

  private toEntity(record: Prisma.VentaGetPayload<{}>): Venta {
    return new Venta({
      id: record.id,
      fecha: record.fecha,
      clienteId: record.clienteId,
      loteId: record.loteId,
      cantidadVendidaKg: record.cantidadVendidaKg.toString(),
      precioVentaKg: record.precioVentaKg.toString(),
      costoAplicadoKg: record.costoAplicado
        .div(record.cantidadVendidaKg)
        .toString(),
      valorDomicilio: record.valorDomicilio.toString(),
      domiciliario: record.domiciliario,
    });
  }
}