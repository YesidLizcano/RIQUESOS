// Infrastructure: PrismaVentaRepo — $transaction for atomic sale + stock deduction with retry
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Venta, type VentaTipo } from '../../domain/entities/Venta';
import { EstadoLote, TipoProducto } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
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
        ventaTipo: venta.ventaTipo,
        bloquesReempacados: venta.bloquesReempacados,
        bloquesEnterosVendidos: venta.bloquesEnterosVendidos,
        bloquesTajadosVendidos: venta.bloquesTajadosVendidos,
        costoEmpaques: new Prisma.Decimal(venta.costoEmpaques.value),
      },
    });
    return this.toEntity(created);
  }

  /**
   * Register a Venta atomically: create the Venta record AND deduct stock from the Lote.
   * Uses Prisma $transaction for atomicity and optimistic locking (version field) on the Lote.
   * Handles block-based deduction for BLOQUES mode and kg-based deduction for GRANEL mode.
   */
  async registrarVentaAtomico(
    venta: Venta,
    loteId: string,
    cantidadKg: string,
    expectedVersion: number,
    ventaTipo: VentaTipo = 'GRANEL',
    empaqueId?: string,
    bloquesReempacados?: number
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

          // 2. Calculate new stock and block counts
          const newStock = currentStock.minus(cantidad);
          const newEstado = newStock.isZero() ? EstadoLote.AGOTADO : lote.estado;

          // Build the Lote update data based on ventaTipo and product type
          const loteUpdateData: Prisma.LoteUpdateManyMutationInput = {
            stockDisponibleKg: newStock,
            estado: newEstado as EstadoLote,
            version: { increment: 1 },
          };

          if (ventaTipo === 'BLOQUES' && (lote.producto as string) === TipoProducto.DOBLE_CREMA) {
            // Block deduction: decrement bloquesEnteros and bloquesTajados
            const bloquesEnterosVendidos = venta.bloquesEnterosVendidos ?? 0;
            const bloquesTajadosVendidos = venta.bloquesTajadosVendidos ?? 0;
            const tajadosDisponibles = lote.bloquesTajados + lote.bloquesTajadosDeFabrica;

            if (bloquesEnterosVendidos > lote.bloquesEnteros) {
              throw new Error(
                `Insufficient whole blocks: available ${lote.bloquesEnteros}, requested ${bloquesEnterosVendidos}`
              );
            }
            if (bloquesTajadosVendidos > tajadosDisponibles) {
              throw new Error(
                `Insufficient cut blocks: available ${tajadosDisponibles}, requested ${bloquesTajadosVendidos}`
              );
            }

            // Deduct tajados from bloquesTajadosDeFabrica first, then bloquesTajados
            let remainingTajados = bloquesTajadosVendidos;
            const fromFabrica = Math.min(remainingTajados, lote.bloquesTajadosDeFabrica);
            remainingTajados -= fromFabrica;
            const fromInternos = remainingTajados;

            loteUpdateData.bloquesEnteros = lote.bloquesEnteros - bloquesEnterosVendidos;
            loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica - fromFabrica;
            loteUpdateData.bloquesTajados = lote.bloquesTajados - fromInternos;
          } else if ((lote.producto as string) === TipoProducto.DOBLE_CREMA) {
            // Granel (kg) deduction for Doble Crema: recalculate bloquesEnteros
            // Partial kg sales can reduce complete block count
            const newBloquesEnteros = Math.floor(Number(newStock) / DOBLE_CREMA_BLOCK_KG);
            loteUpdateData.bloquesEnteros = newBloquesEnteros;
          }
          // For Semisalado: no block fields to update

          // 3. Optimistic locking: update Lote with version check
          const updateResult = await tx.lote.updateMany({
            where: { id: loteId, version: expectedVersion },
            data: loteUpdateData,
          });

          if (updateResult.count === 0) {
            throw new ConcurrencyError(
              `Lote ${loteId} was modified by another transaction (expected version ${expectedVersion})`
            );
          }

          // 4. Create the Venta record
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
              ventaTipo: venta.ventaTipo,
              bloquesReempacados: venta.bloquesReempacados,
              costoEmpaques: new Prisma.Decimal(venta.costoEmpaques.value),
            },
          });

          // 5. Deduct empaque stock if bloquesReempacados > 0
          if (empaqueId && bloquesReempacados && bloquesReempacados > 0) {
            const empaque = await tx.empaque.findUnique({ where: { id: empaqueId } });
            if (!empaque) {
              throw new Error(`Empaque not found: ${empaqueId}`);
            }
            if (empaque.stock < bloquesReempacados) {
              throw new Error(`Stock insuficiente de empaques: disponible ${empaque.stock}, solicitado ${bloquesReempacados}`);
            }
            await tx.empaque.update({
              where: { id: empaqueId },
              data: {
                stock: empaque.stock - bloquesReempacados,
              },
            });
          }

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
      ventaTipo: (record.ventaTipo as 'BLOQUES' | 'GRANEL') ?? 'GRANEL',
      bloquesReempacados: record.bloquesReempacados ?? 0,
      bloquesEnterosVendidos: record.bloquesEnterosVendidos ?? 0,
      bloquesTajadosVendidos: record.bloquesTajadosVendidos ?? 0,
      costoEmpaques: record.costoEmpaques?.toString() ?? '0',
    });
  }
}