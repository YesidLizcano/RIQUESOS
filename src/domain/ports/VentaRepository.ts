// Port: VentaRepository — interface only, no infrastructure imports
// Venta is immutable — no general update method is provided.
// Deletion is handled at the application layer via eliminarVentaAtomico which reverses stock changes.
// updateAbono is provided specifically for payment tracking on credit sales.
import { Venta } from '../entities/Venta';
import type { VentaItem } from '../entities/VentaItem';

export interface VentaRepository {
  save(venta: Venta): Promise<Venta>;
  findById(ventaId: string): Promise<{ venta: Venta; items: VentaItem[] } | null>;
  findByDateRange(inicio: Date, fin: Date): Promise<Venta[]>;
  findByCliente(clienteId: string): Promise<Venta[]>;
  sumIngresosByPeriod(inicio: Date, fin: Date): Promise<string>;
  sumCostosByPeriod(inicio: Date, fin: Date): Promise<string>;
  /** Update only the abono (total payments) field on a Venta. Used by RegistrarAbonoPago. */
  updateAbono(ventaId: string, abono: string): Promise<void>;
  /** Sum ingresoTotal grouped by metodoPago for a date range */
  sumIngresoByMetodoPago(inicio: Date, fin: Date): Promise<{ metodoPago: string; total: string }[]>;
  /** Sum abono for CREDITO ventas grouped by metodoPagoAbono within a date range */
  sumCreditoAbonoByMetodoPagoAbono(inicio: Date, fin: Date): Promise<{ metodoPagoAbono: string | null; total: string }[]>;
  /** Sum monto from AbonoPago records grouped by metodoPago, filtered by venta fecha range */
  sumAbonoPagoByMetodoPago(inicio: Date, fin: Date): Promise<{ metodoPago: string; total: string }[]>;
  /** Sum outstanding saldo (ingresoTotal - abono) for CREDITO ventas where saldo > 0, within a date range */
  sumSaldoPendienteByFecha(inicio: Date, fin: Date): Promise<string>;
  /** Find ventas with outstanding saldo (CREDITO and saldo > 0) within a date range */
  findCuentasPorCobrar(inicio: Date, fin: Date): Promise<{ ventaId: string; clienteNombre: string; fecha: Date; ingresoTotal: string; abono: string; saldo: string; metodoPago: string }[]>;
  /**
   * Register a Venta atomically: create Venta + VentaItems + deduct stock from Lot(es) in one transaction.
   * Uses optimistic locking (version field) on each Lote. Retries on version conflict.
   * Each item includes loteId, cantidadKg, ventaTipo, etc.
   * empaqueItems: map of empaqueId → quantity to deduct from inventory.
   */
  registrarVentaAtomico(params: {
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
    }>;
    empaqueDeductions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<{ venta: Venta; items: VentaItem[] }>;
  /**
   * Delete a Venta atomically: reverse all stock changes (Lote, Empaque, CompraInsumo FIFO)
   * and delete VentaItems + Venta record in one transaction.
   * Uses optimistic locking (version field) on each Lote. Retries on version conflict.
   */
  eliminarVentaAtomico(params: {
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
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueReversions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<void>;
  /**
   * Edit a Venta atomically: reverse old stock changes + delete old VentaItems/Venta,
   * then create new Venta + VentaItems + apply new stock deductions — all in one transaction.
   * Uses optimistic locking (version field) on each Lote. Retries on version conflict.
   */
  editarVentaAtomico(params: {
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
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }>;
    empaqueDeductions: Array<{
      empaqueId: string;
      quantity: number;
    }>;
  }): Promise<{ venta: Venta; items: VentaItem[] }>;
}