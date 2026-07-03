// Port: VentaRepository — interface only, no infrastructure imports
// Venta is immutable — no delete or softDelete method is provided.
// Once a Venta is created, it cannot be removed or marked as deleted.
import { Venta, type VentaTipo } from '../entities/Venta';

export interface VentaRepository {
  save(venta: Venta): Promise<Venta>;
  findByDateRange(inicio: Date, fin: Date): Promise<Venta[]>;
  findByCliente(clienteId: string): Promise<Venta[]>;
  sumIngresosByPeriod(inicio: Date, fin: Date): Promise<string>;
  sumCostosByPeriod(inicio: Date, fin: Date): Promise<string>;
  /**
   * Register a Venta atomically: create Venta + deduct stock from Lote in one transaction.
   * Uses optimistic locking (version field) on the Lote. Retries on version conflict.
   */
  registrarVentaAtomico(
    venta: Venta,
    loteId: string,
    cantidadKg: string,
    expectedVersion: number,
    ventaTipo?: VentaTipo,
    empaqueId?: string,
    bloquesReempacados?: number
  ): Promise<Venta>;
}