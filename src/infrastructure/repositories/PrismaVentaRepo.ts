// Infrastructure: PrismaVentaRepo — $transaction for atomic sale + items + stock deduction
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { EstadoLote, TipoProducto, MetodoPago, OrigenCorte, OrigenTajadoGranel } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';

export class PrismaVentaRepo implements VentaRepository {
  async save(venta: Venta): Promise<Venta> {
    const created = await prisma.venta.create({
      data: {
        clienteId: venta.clienteId,
        sedeId: venta.sedeId,
        cantidadTotalKg: new Prisma.Decimal(venta.cantidadTotalKg.value),
        ingresoTotal: new Prisma.Decimal(venta.ingresoTotal.value),
        costoAplicado: new Prisma.Decimal(venta.costoAplicado.value),
        gananciaBruta: new Prisma.Decimal(venta.gananciaBruta.value),
        valorDomicilio: new Prisma.Decimal(venta.valorDomicilio.value),
        costoDomiciliario: new Prisma.Decimal(venta.costoDomiciliario.value),
        domiciliario: venta.domiciliario,
        metodoPago: venta.metodoPago,
        metodoPagoAbono: venta.metodoPagoAbono,
        abono: new Prisma.Decimal(venta.abono.value),
        observaciones: venta.observaciones || null,
      },
    });
    return this.toEntity(created);
  }

  /**
   * Register a Venta atomically: create Venta + all VentaItems + deduct stock from all affected Lotes.
   * Uses Prisma $transaction for atomicity and optimistic locking (version field) on each Lote.
   */
  async registrarVentaAtomico(params: {
    venta: Venta;
    items: VentaItem[];
      loteDeductions: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      origenTajadoGranel?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueDeductions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<{ venta: Venta; items: VentaItem[] }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Re-fetch current lote versions before each attempt (except the first, which already has them)
      if (attempt > 1) {
        const loteIds = params.loteDeductions.map((d) => d.loteId);
        const freshLotes = await prisma.lote.findMany({ where: { id: { in: loteIds } }, select: { id: true, version: true } });
        const versionMap = new Map(freshLotes.map((l) => [l.id, l.version]));
        for (const deduction of params.loteDeductions) {
          const freshVersion = versionMap.get(deduction.loteId);
          if (freshVersion !== undefined) {
            deduction.expectedVersion = freshVersion;
          }
        }
      }
      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Process each lote deduction
          for (const deduction of params.loteDeductions) {
            const lote = await tx.lote.findUnique({ where: { id: deduction.loteId } });
            if (!lote) {
              throw new Error(`Lote not found: ${deduction.loteId}`);
            }

            if ((lote.estado as string) === EstadoLote.AGOTADO) {
              throw new Error(`Lote ${deduction.loteId} is AGOTADO and cannot accept more sales`);
            }

            const cantidad = new Prisma.Decimal(deduction.cantidadKg);
            const currentStock = new Prisma.Decimal(lote.stockDisponibleKg);

            if (currentStock.lessThan(cantidad)) {
              throw new Error(
                `Insufficient stock: available ${currentStock.toString()} Kg, requested ${deduction.cantidadKg} Kg`
              );
            }

            const newStock = currentStock.minus(cantidad);
            const newEstado = newStock.isZero() && (lote.producto !== 'RECORTES_DOBLE_CREMA') ? EstadoLote.AGOTADO : lote.estado;

            const loteUpdateData: Prisma.LoteUpdateManyMutationInput = {
              stockDisponibleKg: newStock,
              estado: newEstado as EstadoLote,
              version: { increment: 1 },
            };

            if (deduction.ventaTipo === 'BLOQUES' && (lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              const bloquesEnterosVendidos = deduction.bloquesEnterosVendidos;
              const bloquesTajadosVendidos = deduction.bloquesTajadosVendidos;
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

              let remainingTajados = bloquesTajadosVendidos;
              const fromFabrica = deduction.bloquesTajadosDeFabricaVendidos ?? Math.min(remainingTajados, lote.bloquesTajadosDeFabrica);
              remainingTajados -= fromFabrica;
              const fromInternos = deduction.bloquesTajadosInternosVendidos ?? remainingTajados;

              loteUpdateData.bloquesEnteros = lote.bloquesEnteros - bloquesEnterosVendidos;
              loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica - fromFabrica;
              loteUpdateData.bloquesTajados = lote.bloquesTajados - fromInternos;
            } else if ((lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              // GRANEL DC sale — check origenCorte to determine block deductions
              const origenCorte = deduction.origenCorte ?? 'ENTERO';
              const bloquesOriginales = lote.bloquesEnterosOriginal + lote.bloquesTajadosFabricaOriginal;
              const pesoPorBloque = bloquesOriginales > 0
                ? Number(new Prisma.Decimal(lote.cantidadCompradaKg).div(bloquesOriginales))
                : DOBLE_CREMA_BLOCK_KG;

              if (origenCorte === 'ENTERO') {
                // Consume sueltosEntero first, then break enteros blocks
                const kgVendidos = Number(cantidad);
                const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosEntero));
                const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

                let bloquesARomper = 0;
                let sobrante = 0;
                if (kgFaltantes > 0) {
                  bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
                  if (bloquesARomper > lote.bloquesEnteros) {
                    throw new Error(`Bloques enteros insuficientes para origen ENTERO: disponible ${lote.bloquesEnteros}, se necesitan ${bloquesARomper}`);
                  }
                  sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
                }

                // Net change to sueltosEntero: -kgFromSueltos + sobrante
                const sueltosEnteroDelta = Math.round((-kgFromSueltos + sobrante) * 1000) / 1000;
                const newSueltosEntero = new Prisma.Decimal(lote.sueltosEntero).plus(new Prisma.Decimal(sueltosEnteroDelta.toFixed(3)));

                loteUpdateData.bloquesEnteros = lote.bloquesEnteros - bloquesARomper;
                loteUpdateData.sueltosEntero = newSueltosEntero;
              } else if (origenCorte === 'TAJADO') {
                // Consume sueltosTajado first, then break tajados blocks
                const origenTajado = (deduction as { origenTajadoGranel?: string }).origenTajadoGranel ?? 'INTERNO';
                const kgVendidos = Number(cantidad);
                const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosTajado));
                const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

                let bloquesARomper = 0;
                let sobrante = 0;
                if (kgFaltantes > 0) {
                  bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
                  if (origenTajado === 'FABRICA') {
                    if (bloquesARomper > lote.bloquesTajadosDeFabrica) {
                      throw new Error(`Bloques tajados de fábrica insuficientes: disponible ${lote.bloquesTajadosDeFabrica}, se necesitan ${bloquesARomper}`);
                    }
                  } else {
                    const tajadosDisponibles = lote.bloquesTajados + lote.bloquesTajadosDeFabrica;
                    if (bloquesARomper > tajadosDisponibles) {
                      throw new Error(`Bloques tajados insuficientes para origen TAJADO: disponible ${tajadosDisponibles}, se necesitan ${bloquesARomper}`);
                    }
                  }
                  sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
                }

                // Split between factory and internal tajados based on origenTajadoGranel
                let fromFabrica = 0;
                let fromInternos = 0;
                if (origenTajado === 'FABRICA') {
                  fromFabrica = bloquesARomper;
                } else {
                  // INTERNO: prefer factory first, then internal (legacy behavior)
                  let remaining = bloquesARomper;
                  fromFabrica = Math.min(remaining, lote.bloquesTajadosDeFabrica);
                  remaining -= fromFabrica;
                  fromInternos = remaining;
                }

                // Net change to sueltosTajado: -kgFromSueltos + sobrante
                const sueltosTajadoDelta = Math.round((-kgFromSueltos + sobrante) * 1000) / 1000;
                const newSueltosTajado = new Prisma.Decimal(lote.sueltosTajado).plus(new Prisma.Decimal(sueltosTajadoDelta.toFixed(3)));

                loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica - fromFabrica;
                loteUpdateData.bloquesTajados = lote.bloquesTajados - fromInternos;
                loteUpdateData.sueltosTajado = newSueltosTajado;
              }
            }

            const updateResult = await tx.lote.updateMany({
              where: { id: deduction.loteId, version: deduction.expectedVersion },
              data: loteUpdateData,
            });

            if (updateResult.count === 0) {
              throw new ConcurrencyError(
                `Lote ${deduction.loteId} was modified by another transaction (expected version ${deduction.expectedVersion})`
              );
            }
          }

          // 2. Create the Venta record
          const createdVenta = await tx.venta.create({
            data: {
              clienteId: params.venta.clienteId,
              sedeId: params.venta.sedeId,
              cantidadTotalKg: new Prisma.Decimal(params.venta.cantidadTotalKg.value),
              ingresoTotal: new Prisma.Decimal(params.venta.ingresoTotal.value),
              costoAplicado: new Prisma.Decimal(params.venta.costoAplicado.value),
              gananciaBruta: new Prisma.Decimal(params.venta.gananciaBruta.value),
              valorDomicilio: new Prisma.Decimal(params.venta.valorDomicilio.value),
              costoDomiciliario: new Prisma.Decimal(params.venta.costoDomiciliario.value),
              domiciliario: params.venta.domiciliario,
              metodoPago: params.venta.metodoPago,
              metodoPagoAbono: params.venta.metodoPagoAbono,
              abono: new Prisma.Decimal(params.venta.abono.value),
              observaciones: params.venta.observaciones || null,
            },
          });

          // 3. Create all VentaItem records
          const createdItems: Array<{
            id: string;
            ventaId: string;
            loteId: string;
            ventaTipo: string;
            cantidadKg: Prisma.Decimal;
            precioVentaKg: Prisma.Decimal;
            ingreso: Prisma.Decimal;
            costoAplicadoKg: Prisma.Decimal;
            costoAplicado: Prisma.Decimal;
            bloquesEnterosVendidos: number;
            bloquesTajadosVendidos: number;
            bloquesTajadosDeFabricaVendidos: number;
            bloquesTajadosInternosVendidos: number;
            bloquesReempacados: number;
            costoEmpaques: Prisma.Decimal;
            precioEnteroBloque: Prisma.Decimal | null;
            precioTajadoBloque: Prisma.Decimal | null;
            createdAt: Date;
          }> = [];

          for (const item of params.items) {
            const createdItem = await tx.ventaItem.create({
              data: {
                ventaId: createdVenta.id,
                loteId: item.loteId,
                ventaTipo: item.ventaTipo as 'BLOQUES' | 'GRANEL',
                cantidadKg: new Prisma.Decimal(item.cantidadKg.value),
                precioVentaKg: new Prisma.Decimal(item.precioVentaKg.value),
                ingreso: new Prisma.Decimal(item.ingreso.value),
                costoAplicadoKg: new Prisma.Decimal(item.costoAplicadoKg.value),
                costoAplicado: new Prisma.Decimal(item.costoAplicado.value),
                bloquesEnterosVendidos: item.bloquesEnterosVendidos,
                bloquesTajadosVendidos: item.bloquesTajadosVendidos,
                bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
                bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
                bloquesReempacados: item.bloquesReempacados,
                costoEmpaques: new Prisma.Decimal(item.costoEmpaques.value),
                precioEnteroBloque: item.precioEnteroBloque ? new Prisma.Decimal(item.precioEnteroBloque.value) : null,
                precioTajadoBloque: item.precioTajadoBloque ? new Prisma.Decimal(item.precioTajadoBloque.value) : null,
                origenCorte: item.origenCorte ?? 'ENTERO',
                origenTajadoGranel: item.origenTajadoGranel ?? null,
                sueltosEnteroDelta: new Prisma.Decimal(item.sueltosEnteroDelta),
                sueltosTajadoDelta: new Prisma.Decimal(item.sueltosTajadoDelta),
              },
            });
            createdItems.push(createdItem);
          }

          // 4. Deduct empaque stock + FIFO lot deduction
          for (const empaqueDeduction of params.empaqueDeductions) {
            const empaque = await tx.empaque.findUnique({ where: { id: empaqueDeduction.empaqueId } });
            if (!empaque) {
              throw new Error(`Empaque not found: ${empaqueDeduction.empaqueId}`);
            }
            if (empaque.stock.lessThan(empaqueDeduction.quantity)) {
              throw new Error(`Stock insuficiente de empaques: disponible ${empaque.stock}, solicitado ${empaqueDeduction.quantity}`);
            }
            await tx.empaque.update({
              where: { id: empaqueDeduction.empaqueId },
              data: {
                stock: empaque.stock.minus(empaqueDeduction.quantity),
              },
            });
            await this.deductFifoLots(tx, empaqueDeduction.empaqueId, new Prisma.Decimal(empaqueDeduction.quantity));
            await this.updateEmpaquePrecioFromActiveLot(tx, empaqueDeduction.empaqueId);
          }

          // 4b. Create initial AbonoPago if abono > 0 (CREDITO sales)
          const abonoValue = new Prisma.Decimal(params.venta.abono.value);
          if (abonoValue.greaterThan(0) && params.venta.metodoPago === 'CREDITO') {
            await tx.abonoPago.create({
              data: {
                ventaId: createdVenta.id,
                monto: abonoValue,
                metodoPago: params.venta.metodoPagoAbono ?? 'EFECTIVO',
                observacion: 'Abono inicial',
              },
            });
          }

          return { venta: createdVenta, items: createdItems };
        });

        // Convert results to entities
        const ventaEntity = this.toEntity(result.venta);
        const itemEntities = result.items.map((item) => this.toItemEntity(item));
        return { venta: ventaEntity, items: itemEntities };
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          lastError = error;
          // Re-fetch all lote versions for retry
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
      include: { items: true },
    });
    return records.map((r) => this.toEntity(r, r.items));
  }

  async findById(ventaId: string): Promise<{ venta: Venta; items: VentaItem[] } | null> {
    const record = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: { items: true },
    });
    if (!record) return null;
    return {
      venta: this.toEntity(record, record.items),
      items: record.items.map((item) => this.toItemEntity(item)),
    };
  }

  async findByCliente(clienteId: string): Promise<Venta[]> {
    const records = await prisma.venta.findMany({
      where: { clienteId },
      orderBy: { fecha: 'desc' },
      include: { items: true },
    });
    return records.map((r) => this.toEntity(r, r.items));
  }

  /**
   * Delete a Venta atomically: reverse all stock changes and delete the Venta + VentaItems.
   * Uses optimistic locking (version field) on each Lote. Retries on version conflict.
   */
  async eliminarVentaAtomico(params: {
    ventaId: string;
    loteReversions: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      origenTajadoGranel?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueReversions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Re-fetch current lote versions before each retry
      if (attempt > 1) {
        const loteIds = params.loteReversions.map((r) => r.loteId);
        const freshLotes = await prisma.lote.findMany({ where: { id: { in: loteIds } }, select: { id: true, version: true } });
        const versionMap = new Map(freshLotes.map((l) => [l.id, l.version]));
        for (const reversal of params.loteReversions) {
          const freshVersion = versionMap.get(reversal.loteId);
          if (freshVersion !== undefined) {
            reversal.expectedVersion = freshVersion;
          }
        }
      }
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Verify Venta exists
          const venta = await tx.venta.findUnique({ where: { id: params.ventaId } });
          if (!venta) {
            throw new Error(`Venta not found: ${params.ventaId}`);
          }

          // 2. Reverse each Lote stock change
          for (const reversal of params.loteReversions) {
            const lote = await tx.lote.findUnique({ where: { id: reversal.loteId } });
            if (!lote) {
              throw new Error(`Lote not found: ${reversal.loteId}`);
            }

            const cantidad = new Prisma.Decimal(reversal.cantidadKg);
            const currentStock = new Prisma.Decimal(lote.stockDisponibleKg);
            const newStock = currentStock.plus(cantidad);

            // Determine new estado — if was AGOTADO and now has stock, set back to ACTIVO
            const newEstado = (lote.estado as string) === EstadoLote.AGOTADO
              ? EstadoLote.ACTIVO
              : lote.estado;

            const loteUpdateData: Prisma.LoteUpdateManyMutationInput = {
              stockDisponibleKg: newStock,
              estado: newEstado as EstadoLote,
              version: { increment: 1 },
            };

            // Reverse block changes for DOBLE_CREMA
            if ((lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              if (reversal.ventaTipo === 'BLOQUES') {
                const fromFabrica = reversal.bloquesTajadosDeFabricaVendidos ?? reversal.bloquesTajadosVendidos;
                const fromInternos = reversal.bloquesTajadosInternosVendidos ?? 0;
                loteUpdateData.bloquesEnteros = lote.bloquesEnteros + reversal.bloquesEnterosVendidos;
                loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica + fromFabrica;
                loteUpdateData.bloquesTajados = lote.bloquesTajados + fromInternos;
              } else {
                // GRANEL reversal: restore blocks and sueltos based on origenCorte
                const origenCorte = reversal.origenCorte ?? 'ENTERO';

                if (origenCorte === 'ENTERO') {
                  // Restore bloquesEnteros
                  loteUpdateData.bloquesEnteros = lote.bloquesEnteros + reversal.bloquesEnterosVendidos;
                  // Reverse sueltosEntero: subtract the net delta (which was negative for consumption)
                  const delta = new Prisma.Decimal(reversal.sueltosEnteroDelta ?? '0');
                  loteUpdateData.sueltosEntero = new Prisma.Decimal(lote.sueltosEntero).minus(delta);
                } else if (origenCorte === 'TAJADO') {
                  // Reverse: add all to internal tajados (simplification)
                  loteUpdateData.bloquesTajados = lote.bloquesTajados + reversal.bloquesTajadosVendidos;
                  // Reverse sueltosTajado: subtract the net delta
                  const delta = new Prisma.Decimal(reversal.sueltosTajadoDelta ?? '0');
                  loteUpdateData.sueltosTajado = new Prisma.Decimal(lote.sueltosTajado).minus(delta);
                }
              }
            }

            const updateResult = await tx.lote.updateMany({
              where: { id: reversal.loteId, version: reversal.expectedVersion },
              data: loteUpdateData,
            });

            if (updateResult.count === 0) {
              throw new ConcurrencyError(
                `Lote ${reversal.loteId} was modified by another transaction (expected version ${reversal.expectedVersion})`
              );
            }
          }

          // 3. Reverse empaque stock and CompraInsumo FIFO lots
          for (const empaqueReversal of params.empaqueReversions) {
            const empaque = await tx.empaque.findUnique({ where: { id: empaqueReversal.empaqueId } });
            if (!empaque) {
              throw new Error(`Empaque not found: ${empaqueReversal.empaqueId}`);
            }

            await tx.empaque.update({
              where: { id: empaqueReversal.empaqueId },
              data: {
                stock: empaque.stock.plus(empaqueReversal.quantity),
              },
            });

            // Restore quantity to the most recent active CompraInsumo lot for this empaque
            await this.restoreFifoLots(tx, empaqueReversal.empaqueId, new Prisma.Decimal(empaqueReversal.quantity));
            await this.updateEmpaquePrecioFromActiveLot(tx, empaqueReversal.empaqueId);
          }

          // 4. Delete all AbonoPago records for this Venta
          await tx.abonoPago.deleteMany({ where: { ventaId: params.ventaId } });

          // 5. Delete all VentaItems
          await tx.ventaItem.deleteMany({ where: { ventaId: params.ventaId } });

          // 6. Delete the Venta
          await tx.venta.delete({ where: { id: params.ventaId } });
        });

        return;
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Venta deletion failed after max retries');
  }

  /**
   * Edit a Venta atomically: reverse old stock changes + delete old VentaItems/Venta,
   * then create new Venta + VentaItems + apply new stock deductions — all in one transaction.
   * Uses optimistic locking (version field) on each Lote. Retries on version conflict.
   */
  async editarVentaAtomico(params: {
    oldVentaId: string;
    reversals: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      origenTajadoGranel?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueReversions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
    newVenta: Venta;
    newItems: VentaItem[];
    loteDeductions: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      origenTajadoGranel?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueDeductions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<{ venta: Venta; items: VentaItem[] }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Re-fetch current lote versions before each retry
      if (attempt > 1) {
        const reversalLoteIds = params.reversals.map((r) => r.loteId);
        const deductionLoteIds = params.loteDeductions.map((d) => d.loteId);
        const allLoteIds = [...new Set([...reversalLoteIds, ...deductionLoteIds])];
        const freshLotes = await prisma.lote.findMany({ where: { id: { in: allLoteIds } }, select: { id: true, version: true } });
        const versionMap = new Map(freshLotes.map((l) => [l.id, l.version]));
        for (const reversal of params.reversals) {
          const freshVersion = versionMap.get(reversal.loteId);
          if (freshVersion !== undefined) {
            reversal.expectedVersion = freshVersion;
          }
        }
        for (const deduction of params.loteDeductions) {
          const freshVersion = versionMap.get(deduction.loteId);
          if (freshVersion !== undefined) {
            deduction.expectedVersion = freshVersion;
          }
        }
      }
      try {
        const result = await prisma.$transaction(async (tx) => {
          // ============================================
          // PHASE 1: REVERSE OLD VENTA
          // ============================================

          // 1a. Verify old Venta exists
          const oldVenta = await tx.venta.findUnique({ where: { id: params.oldVentaId } });
          if (!oldVenta) {
            throw new Error(`Venta not found: ${params.oldVentaId}`);
          }

          // 1b. Reverse each Lote stock change from old venta
          for (const reversal of params.reversals) {
            const lote = await tx.lote.findUnique({ where: { id: reversal.loteId } });
            if (!lote) {
              throw new Error(`Lote not found: ${reversal.loteId}`);
            }

            const cantidad = new Prisma.Decimal(reversal.cantidadKg);
            const currentStock = new Prisma.Decimal(lote.stockDisponibleKg);
            const newStock = currentStock.plus(cantidad);

            const newEstado = (lote.estado as string) === EstadoLote.AGOTADO
              ? EstadoLote.ACTIVO
              : lote.estado;

            const loteUpdateData: Prisma.LoteUpdateManyMutationInput = {
              stockDisponibleKg: newStock,
              estado: newEstado as EstadoLote,
              version: { increment: 1 },
            };

            // Reverse block changes for DOBLE_CREMA
            if ((lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              if (reversal.ventaTipo === 'BLOQUES') {
                const fromFabrica = reversal.bloquesTajadosDeFabricaVendidos ?? reversal.bloquesTajadosVendidos;
                const fromInternos = reversal.bloquesTajadosInternosVendidos ?? 0;
                loteUpdateData.bloquesEnteros = lote.bloquesEnteros + reversal.bloquesEnterosVendidos;
                loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica + fromFabrica;
                loteUpdateData.bloquesTajados = lote.bloquesTajados + fromInternos;
              } else {
                // GRANEL reversal: restore blocks and sueltos based on origenCorte
                const origenCorte = reversal.origenCorte ?? 'ENTERO';

                if (origenCorte === 'ENTERO') {
                  loteUpdateData.bloquesEnteros = lote.bloquesEnteros + reversal.bloquesEnterosVendidos;
                  const delta = new Prisma.Decimal(reversal.sueltosEnteroDelta ?? '0');
                  loteUpdateData.sueltosEntero = new Prisma.Decimal(lote.sueltosEntero).minus(delta);
                } else if (origenCorte === 'TAJADO') {
                  loteUpdateData.bloquesTajados = lote.bloquesTajados + reversal.bloquesTajadosVendidos;
                  const delta = new Prisma.Decimal(reversal.sueltosTajadoDelta ?? '0');
                  loteUpdateData.sueltosTajado = new Prisma.Decimal(lote.sueltosTajado).minus(delta);
                }
              }
            }

            const updateResult = await tx.lote.updateMany({
              where: { id: reversal.loteId, version: reversal.expectedVersion },
              data: loteUpdateData,
            });

            if (updateResult.count === 0) {
              throw new ConcurrencyError(
                `Lote ${reversal.loteId} was modified by another transaction (expected version ${reversal.expectedVersion})`
              );
            }
          }

          // 1c. Reverse empaque stock and CompraInsumo FIFO lots from old venta
          for (const empaqueReversal of params.empaqueReversions) {
            const empaque = await tx.empaque.findUnique({ where: { id: empaqueReversal.empaqueId } });
            if (!empaque) {
              throw new Error(`Empaque not found: ${empaqueReversal.empaqueId}`);
            }

            await tx.empaque.update({
              where: { id: empaqueReversal.empaqueId },
              data: {
                stock: empaque.stock.plus(empaqueReversal.quantity),
              },
            });

            await this.restoreFifoLots(tx, empaqueReversal.empaqueId, new Prisma.Decimal(empaqueReversal.quantity));
            await this.updateEmpaquePrecioFromActiveLot(tx, empaqueReversal.empaqueId);
          }

          // 1d. Delete all AbonoPago records for the old Venta
          await tx.abonoPago.deleteMany({ where: { ventaId: params.oldVentaId } });

          // 1e. Delete old VentaItems
          await tx.ventaItem.deleteMany({ where: { ventaId: params.oldVentaId } });

          // 1f. Delete old Venta
          await tx.venta.delete({ where: { id: params.oldVentaId } });

          // ============================================
          // PHASE 2: CREATE NEW VENTA
          // ============================================

          // 2a. Apply new lote deductions
          for (const deduction of params.loteDeductions) {
            const lote = await tx.lote.findUnique({ where: { id: deduction.loteId } });
            if (!lote) {
              throw new Error(`Lote not found: ${deduction.loteId}`);
            }

            if ((lote.estado as string) === EstadoLote.AGOTADO) {
              throw new Error(`Lote ${deduction.loteId} is AGOTADO and cannot accept more sales`);
            }

            const cantidad = new Prisma.Decimal(deduction.cantidadKg);
            const currentStock = new Prisma.Decimal(lote.stockDisponibleKg);

            if (currentStock.lessThan(cantidad)) {
              throw new Error(
                `Insufficient stock: available ${currentStock.toString()} Kg, requested ${deduction.cantidadKg} Kg`
              );
            }

            const newStock = currentStock.minus(cantidad);
            const newEstado = newStock.isZero() && (lote.producto !== 'RECORTES_DOBLE_CREMA') ? EstadoLote.AGOTADO : lote.estado;

            const loteUpdateData: Prisma.LoteUpdateManyMutationInput = {
              stockDisponibleKg: newStock,
              estado: newEstado as EstadoLote,
              version: { increment: 1 },
            };

            if (deduction.ventaTipo === 'BLOQUES' && (lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              const bloquesEnterosVendidos = deduction.bloquesEnterosVendidos;
              const bloquesTajadosVendidos = deduction.bloquesTajadosVendidos;
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

              let remainingTajados = bloquesTajadosVendidos;
              const fromFabrica = deduction.bloquesTajadosDeFabricaVendidos ?? Math.min(remainingTajados, lote.bloquesTajadosDeFabrica);
              remainingTajados -= fromFabrica;
              const fromInternos = deduction.bloquesTajadosInternosVendidos ?? remainingTajados;

              loteUpdateData.bloquesEnteros = lote.bloquesEnteros - bloquesEnterosVendidos;
              loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica - fromFabrica;
              loteUpdateData.bloquesTajados = lote.bloquesTajados - fromInternos;
            } else if ((lote.producto as string) === TipoProducto.DOBLE_CREMA) {
              // GRANEL DC sale — check origenCorte to determine block deductions
              const origenCorte = deduction.origenCorte ?? 'ENTERO';
              const bloquesOriginales = lote.bloquesEnterosOriginal + lote.bloquesTajadosFabricaOriginal;
              const pesoPorBloque = bloquesOriginales > 0
                ? Number(new Prisma.Decimal(lote.cantidadCompradaKg).div(bloquesOriginales))
                : DOBLE_CREMA_BLOCK_KG;

              if (origenCorte === 'ENTERO') {
                const kgVendidos = Number(cantidad);
                const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosEntero));
                const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

                let bloquesARomper = 0;
                let sobrante = 0;
                if (kgFaltantes > 0) {
                  bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
                  if (bloquesARomper > lote.bloquesEnteros) {
                    throw new Error(`Bloques enteros insuficientes para origen ENTERO: disponible ${lote.bloquesEnteros}, se necesitan ${bloquesARomper}`);
                  }
                  sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
                }

                const sueltosEnteroDelta = Math.round((-kgFromSueltos + sobrante) * 1000) / 1000;
                const newSueltosEntero = new Prisma.Decimal(lote.sueltosEntero).plus(new Prisma.Decimal(sueltosEnteroDelta.toFixed(3)));

                loteUpdateData.bloquesEnteros = lote.bloquesEnteros - bloquesARomper;
                loteUpdateData.sueltosEntero = newSueltosEntero;
              } else if (origenCorte === 'TAJADO') {
                const kgVendidos = Number(cantidad);
                const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosTajado));
                const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

                let bloquesARomper = 0;
                let sobrante = 0;
                if (kgFaltantes > 0) {
                  bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
                  const tajadosDisponibles = lote.bloquesTajados + lote.bloquesTajadosDeFabrica;
                  if (bloquesARomper > tajadosDisponibles) {
                    throw new Error(`Bloques tajados insuficientes para origen TAJADO: disponible ${tajadosDisponibles}, se necesitan ${bloquesARomper}`);
                  }
                  sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
                }

                let remaining = bloquesARomper;
                const fromFabrica = Math.min(remaining, lote.bloquesTajadosDeFabrica);
                remaining -= fromFabrica;
                const fromInternos = remaining;

                const sueltosTajadoDelta = Math.round((-kgFromSueltos + sobrante) * 1000) / 1000;
                const newSueltosTajado = new Prisma.Decimal(lote.sueltosTajado).plus(new Prisma.Decimal(sueltosTajadoDelta.toFixed(3)));

                loteUpdateData.bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica - fromFabrica;
                loteUpdateData.bloquesTajados = lote.bloquesTajados - fromInternos;
                loteUpdateData.sueltosTajado = newSueltosTajado;
              }
            }

            const updateResult = await tx.lote.updateMany({
              where: { id: deduction.loteId, version: deduction.expectedVersion },
              data: loteUpdateData,
            });

            if (updateResult.count === 0) {
              throw new ConcurrencyError(
                `Lote ${deduction.loteId} was modified by another transaction (expected version ${deduction.expectedVersion})`
              );
            }
          }

          // 2b. Create new Venta record
          const createdVenta = await tx.venta.create({
            data: {
              clienteId: params.newVenta.clienteId,
              sedeId: params.newVenta.sedeId,
              cantidadTotalKg: new Prisma.Decimal(params.newVenta.cantidadTotalKg.value),
              ingresoTotal: new Prisma.Decimal(params.newVenta.ingresoTotal.value),
              costoAplicado: new Prisma.Decimal(params.newVenta.costoAplicado.value),
              gananciaBruta: new Prisma.Decimal(params.newVenta.gananciaBruta.value),
              valorDomicilio: new Prisma.Decimal(params.newVenta.valorDomicilio.value),
              costoDomiciliario: new Prisma.Decimal(params.newVenta.costoDomiciliario.value),
              domiciliario: params.newVenta.domiciliario,
              metodoPago: params.newVenta.metodoPago,
              metodoPagoAbono: params.newVenta.metodoPagoAbono,
              abono: new Prisma.Decimal(params.newVenta.abono.value),
              observaciones: params.newVenta.observaciones || null,
            },
          });

          // 2c. Create all new VentaItem records
          const createdItems: Array<{
            id: string;
            ventaId: string;
            loteId: string;
            ventaTipo: string;
            cantidadKg: Prisma.Decimal;
            precioVentaKg: Prisma.Decimal;
            ingreso: Prisma.Decimal;
            costoAplicadoKg: Prisma.Decimal;
            costoAplicado: Prisma.Decimal;
            bloquesEnterosVendidos: number;
            bloquesTajadosVendidos: number;
            bloquesTajadosDeFabricaVendidos: number;
            bloquesTajadosInternosVendidos: number;
            bloquesReempacados: number;
            costoEmpaques: Prisma.Decimal;
            precioEnteroBloque: Prisma.Decimal | null;
            precioTajadoBloque: Prisma.Decimal | null;
            createdAt: Date;
          }> = [];

          for (const item of params.newItems) {
            const createdItem = await tx.ventaItem.create({
              data: {
                ventaId: createdVenta.id,
                loteId: item.loteId,
                ventaTipo: item.ventaTipo as 'BLOQUES' | 'GRANEL',
                cantidadKg: new Prisma.Decimal(item.cantidadKg.value),
                precioVentaKg: new Prisma.Decimal(item.precioVentaKg.value),
                ingreso: new Prisma.Decimal(item.ingreso.value),
                costoAplicadoKg: new Prisma.Decimal(item.costoAplicadoKg.value),
                costoAplicado: new Prisma.Decimal(item.costoAplicado.value),
                bloquesEnterosVendidos: item.bloquesEnterosVendidos,
                bloquesTajadosVendidos: item.bloquesTajadosVendidos,
                bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
                bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
                bloquesReempacados: item.bloquesReempacados,
                costoEmpaques: new Prisma.Decimal(item.costoEmpaques.value),
                precioEnteroBloque: item.precioEnteroBloque ? new Prisma.Decimal(item.precioEnteroBloque.value) : null,
                precioTajadoBloque: item.precioTajadoBloque ? new Prisma.Decimal(item.precioTajadoBloque.value) : null,
                origenCorte: item.origenCorte ?? 'ENTERO',
                origenTajadoGranel: item.origenTajadoGranel ?? null,
                sueltosEnteroDelta: new Prisma.Decimal(item.sueltosEnteroDelta),
                sueltosTajadoDelta: new Prisma.Decimal(item.sueltosTajadoDelta),
              },
            });
            createdItems.push(createdItem);
          }

          // 2d. Deduct empaque stock + FIFO lot deduction for new items
          for (const empaqueDeduction of params.empaqueDeductions) {
            const empaque = await tx.empaque.findUnique({ where: { id: empaqueDeduction.empaqueId } });
            if (!empaque) {
              throw new Error(`Empaque not found: ${empaqueDeduction.empaqueId}`);
            }
            if (empaque.stock.lessThan(empaqueDeduction.quantity)) {
              throw new Error(`Stock insuficiente de empaques: disponible ${empaque.stock}, solicitado ${empaqueDeduction.quantity}`);
            }
            await tx.empaque.update({
              where: { id: empaqueDeduction.empaqueId },
              data: {
                stock: empaque.stock.minus(empaqueDeduction.quantity),
              },
            });
            await this.deductFifoLots(tx, empaqueDeduction.empaqueId, new Prisma.Decimal(empaqueDeduction.quantity));
            await this.updateEmpaquePrecioFromActiveLot(tx, empaqueDeduction.empaqueId);
          }

          // 2e. Create initial AbonoPago if abono > 0 (CREDITO sales)
          const editAbonoValue = new Prisma.Decimal(params.newVenta.abono.value);
          if (editAbonoValue.greaterThan(0) && params.newVenta.metodoPago === 'CREDITO') {
            await tx.abonoPago.create({
              data: {
                ventaId: createdVenta.id,
                monto: editAbonoValue,
                metodoPago: params.newVenta.metodoPagoAbono ?? 'EFECTIVO',
                observacion: 'Abono inicial',
              },
            });
          }

          return { venta: createdVenta, items: createdItems };
        });

        // Convert results to entities
        const ventaEntity = this.toEntity(result.venta);
        const itemEntities = result.items.map((item) => this.toItemEntity(item));
        return { venta: ventaEntity, items: itemEntities };
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Venta edit failed after max retries');
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

  async updateAbono(ventaId: string, abono: string): Promise<void> {
    await prisma.venta.update({
      where: { id: ventaId },
      data: { abono: new Prisma.Decimal(abono) },
    });
  }

  async sumIngresoByMetodoPago(inicio: Date, fin: Date): Promise<{ metodoPago: string; total: string }[]> {
    const results = await prisma.venta.groupBy({
      by: ['metodoPago'],
      where: {
        fecha: { gte: inicio, lte: fin },
      },
      _sum: { ingresoTotal: true },
    });
    return results.map((r) => ({
      metodoPago: r.metodoPago,
      total: (r._sum.ingresoTotal ?? new Prisma.Decimal(0)).toString(),
    }));
  }

  async sumCreditoAbonoByMetodoPagoAbono(inicio: Date, fin: Date): Promise<{ metodoPagoAbono: string | null; total: string }[]> {
    const results = await prisma.venta.groupBy({
      by: ['metodoPagoAbono'],
      where: {
        metodoPago: 'CREDITO',
        fecha: { gte: inicio, lte: fin },
        abono: { gt: 0 },
      },
      _sum: { abono: true },
    });
    return results.map((r) => ({
      metodoPagoAbono: r.metodoPagoAbono,
      total: (r._sum.abono ?? new Prisma.Decimal(0)).toString(),
    }));
  }

  async sumAbonoPagoByMetodoPago(inicio: Date, fin: Date): Promise<{ metodoPago: string; total: string }[]> {
    const results = await prisma.abonoPago.groupBy({
      by: ['metodoPago'],
      where: {
        venta: {
          fecha: { gte: inicio, lte: fin },
        },
      },
      _sum: { monto: true },
    });
    return results.map((r) => ({
      metodoPago: r.metodoPago,
      total: (r._sum.monto ?? new Prisma.Decimal(0)).toString(),
    }));
  }

  async sumSaldoPendienteByFecha(inicio: Date, fin: Date): Promise<string> {
    // SQLite doesn't support column arithmetic in aggregation directly,
    // so we fetch CREDITO ventas in range and compute saldo in JS
    const records = await prisma.venta.findMany({
      where: {
        metodoPago: 'CREDITO',
        fecha: { gte: inicio, lte: fin },
      },
      select: {
        ingresoTotal: true,
        abono: true,
      },
    });
    let total = new Prisma.Decimal(0);
    for (const r of records) {
      const ingreso = new Prisma.Decimal(r.ingresoTotal);
      const abono = new Prisma.Decimal(r.abono);
      const saldo = ingreso.sub(abono);
      if (saldo.greaterThan(0)) {
        total = total.add(saldo);
      }
    }
    return total.toString();
  }

  async findCuentasPorCobrar(inicio: Date, fin: Date): Promise<{ ventaId: string; clienteNombre: string; fecha: Date; ingresoTotal: string; abono: string; saldo: string; metodoPago: string }[]> {
    const ventas = await prisma.venta.findMany({
      where: {
        metodoPago: 'CREDITO',
        fecha: { gte: inicio, lte: fin },
      },
      include: { cliente: { select: { nombre: true } }, sede: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
    });

    return ventas
      .map(v => {
        const ingresoTotal = new Prisma.Decimal(v.ingresoTotal);
        const abono = new Prisma.Decimal(v.abono);
        const saldo = ingresoTotal.sub(abono);
        if (saldo.lte(0)) return null;
        return {
          ventaId: v.id,
          clienteNombre: v.cliente.nombre,
          sedeNombre: v.sede?.nombre ?? null,
          fecha: v.fecha,
          ingresoTotal: ingresoTotal.toString(),
          abono: abono.toString(),
          saldo: saldo.toString(),
          metodoPago: v.metodoPago,
        };
      })
      .filter(Boolean) as { ventaId: string; clienteNombre: string; fecha: Date; ingresoTotal: string; abono: string; saldo: string; metodoPago: string }[];
  }

  private toEntity(
    record: Prisma.VentaGetPayload<{}> | { id: string; clienteId: string; sedeId?: string | null; fecha: Date; cantidadTotalKg: Prisma.Decimal | number; ingresoTotal: Prisma.Decimal | number; costoAplicado: Prisma.Decimal | number; gananciaBruta: Prisma.Decimal | number; valorDomicilio: Prisma.Decimal | number; costoDomiciliario: Prisma.Decimal | number; domiciliario: string; metodoPago: string; metodoPagoAbono: string | null; abono: Prisma.Decimal | number; observaciones: string | null; createdAt: Date },
    _items?: unknown[]
  ): Venta {
    return new Venta({
      id: record.id,
      fecha: record.fecha,
      clienteId: record.clienteId,
      sedeId: (record as any).sedeId ?? null,
      cantidadTotalKg: String(record.cantidadTotalKg),
      ingresoTotal: String(record.ingresoTotal),
      costoAplicado: String(record.costoAplicado),
      gananciaBruta: String(record.gananciaBruta),
      valorDomicilio: String(record.valorDomicilio),
      costoDomiciliario: String(record.costoDomiciliario),
      domiciliario: record.domiciliario,
      metodoPago: record.metodoPago,
      metodoPagoAbono: record.metodoPagoAbono,
      abono: String(record.abono),
      observaciones: record.observaciones ?? '',
    });
  }

  private toItemEntity(record: {
    id: string;
    ventaId: string;
    loteId: string;
    ventaTipo: string;
    cantidadKg: Prisma.Decimal | number;
    precioVentaKg: Prisma.Decimal | number;
    ingreso: Prisma.Decimal | number;
    costoAplicadoKg: Prisma.Decimal | number;
    costoAplicado: Prisma.Decimal | number;
    bloquesEnterosVendidos: number;
    bloquesTajadosVendidos: number;
    bloquesTajadosDeFabricaVendidos: number;
    bloquesTajadosInternosVendidos: number;
    bloquesReempacados: number;
    costoEmpaques: Prisma.Decimal | number;
    precioEnteroBloque?: Prisma.Decimal | number | null;
      precioTajadoBloque?: Prisma.Decimal | number | null;
      origenCorte?: string | null;
      origenTajadoGranel?: string | null;
      sueltosEnteroDelta?: Prisma.Decimal | number;
    sueltosTajadoDelta?: Prisma.Decimal | number;
  }): VentaItem {
    return new VentaItem({
      id: record.id,
      ventaId: record.ventaId,
      loteId: record.loteId,
      ventaTipo: record.ventaTipo as 'BLOQUES' | 'GRANEL',
      cantidadKg: record.cantidadKg.toString(),
      precioVentaKg: record.precioVentaKg.toString(),
      ingreso: record.ingreso.toString(),
      costoAplicadoKg: record.costoAplicadoKg.toString(),
      costoAplicado: record.costoAplicado.toString(),
      bloquesEnterosVendidos: record.bloquesEnterosVendidos,
      bloquesTajadosVendidos: record.bloquesTajadosVendidos,
      bloquesTajadosDeFabricaVendidos: record.bloquesTajadosDeFabricaVendidos,
      bloquesTajadosInternosVendidos: record.bloquesTajadosInternosVendidos,
      bloquesReempacados: record.bloquesReempacados,
      costoEmpaques: record.costoEmpaques.toString(),
      precioEnteroBloque: record.precioEnteroBloque?.toString() ?? undefined,
      precioTajadoBloque: record.precioTajadoBloque?.toString() ?? undefined,
      origenCorte: (record.origenCorte as OrigenCorte) ?? undefined,
      origenTajadoGranel: (record.origenTajadoGranel as OrigenTajadoGranel) ?? undefined,
      sueltosEnteroDelta: record.sueltosEnteroDelta?.toString() ?? undefined,
      sueltosTajadoDelta: record.sueltosTajadoDelta?.toString() ?? undefined,
    });
  }

  /**
   * Deduct quantity from CompraInsumo lots in FIFO order (oldest first).
   * Must be called within a transaction (tx).
   */
  private async deductFifoLots(
    tx: Prisma.TransactionClient,
    empaqueId: string,
    totalToDeduct: Prisma.Decimal,
  ): Promise<void> {
    let activeLots = await tx.compraInsumo.findMany({
      where: {
        empaqueId,
        cantidadRestante: { gt: 0 },
      },
      orderBy: { fecha: 'asc' },
    });

    if (activeLots.length === 0) {
      const empaque = await tx.empaque.findUnique({ where: { id: empaqueId } });
      if (empaque && empaque.stock.greaterThan(0)) {
        const now = new Date();
        await tx.compraInsumo.create({
          data: {
            empaqueId,
            categoria: empaque.categoria,
            cantidad: empaque.stock,
            cantidadRestante: empaque.stock,
            precioUnitario: empaque.precio,
            costoTotal: empaque.stock.mul(empaque.precio),
            fecha: now,
          },
        });
        activeLots = await tx.compraInsumo.findMany({
          where: {
            empaqueId,
            cantidadRestante: { gt: 0 },
          },
          orderBy: { fecha: 'asc' },
        });
      }
    }

    let remaining = new Prisma.Decimal(totalToDeduct);

    for (const lot of activeLots) {
      if (remaining.isZero() || remaining.lte(0)) break;

      const available = new Prisma.Decimal(lot.cantidadRestante);
      if (available.lte(0)) continue;

      const deduction = available.lt(remaining) ? available : remaining;

      await tx.compraInsumo.update({
        where: { id: lot.id },
        data: {
          cantidadRestante: new Prisma.Decimal(lot.cantidadRestante).minus(deduction),
        },
      });

      remaining = remaining.minus(deduction);
    }
  }

  /**
   * Update the empaque's precio to reflect the oldest active lot's precioUnitario.
   * Must be called within a transaction (tx).
   */
  private async updateEmpaquePrecioFromActiveLot(
    tx: Prisma.TransactionClient,
    empaqueId: string,
  ): Promise<void> {
    const activeLots = await tx.compraInsumo.findMany({
      where: {
        empaqueId,
        cantidadRestante: { gt: 0 },
      },
      orderBy: { fecha: 'asc' },
    });

    if (activeLots.length > 0) {
      const activePrice = activeLots[0].precioUnitario;
      await tx.empaque.update({
        where: { id: empaqueId },
        data: { precio: activePrice },
      });
    }
  }

  /**
   * Restore quantity to CompraInsumo lots (reverse of FIFO deduction).
   * Since we originally deducted from the oldest lots first (FIFO),
   * we restore to the most recent active lot (LIFO restore).
   * Must be called within a transaction (tx).
   */
  private async restoreFifoLots(
    tx: Prisma.TransactionClient,
    empaqueId: string,
    quantityToRestore: Prisma.Decimal,
  ): Promise<void> {
    // Find the most recent active lot for this empaque
    const activeLots = await tx.compraInsumo.findMany({
      where: {
        empaqueId,
        cantidadRestante: { gt: 0 },
      },
      orderBy: { fecha: 'desc' },
    });

    if (activeLots.length > 0) {
      // Restore to the most recent active lot (LIFO)
      const lot = activeLots[0];
      await tx.compraInsumo.update({
        where: { id: lot.id },
        data: {
          cantidadRestante: new Prisma.Decimal(lot.cantidadRestante).plus(quantityToRestore),
        },
      });
    } else {
      // No active lots — find the most recent lot regardless
      const allLots = await tx.compraInsumo.findMany({
        where: { empaqueId },
        orderBy: { fecha: 'desc' },
      });

      if (allLots.length > 0) {
        const lot = allLots[0];
        await tx.compraInsumo.update({
          where: { id: lot.id },
          data: {
            cantidadRestante: new Prisma.Decimal(lot.cantidadRestante).plus(quantityToRestore),
          },
        });
      }
      // If no lots exist at all, we can't restore — but this shouldn't happen
      // in normal operation since the empaque was previously deducted from lots
    }
  }
}