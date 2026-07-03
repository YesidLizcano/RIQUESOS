// Entity: Lote — cost calculation, status transition, version field, block management
// No external imports from infrastructure or frameworks

import { TipoProducto, EstadoLote } from '../enums';
import { Dinero } from '../value-objects/Dinero';
import { Kilogramo } from '../value-objects/Kilogramo';

export interface LoteProps {
  id?: string;
  producto: TipoProducto;
  fechaIngreso?: Date;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloque?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  stockDisponibleKg?: string;
  bloquesEnteros?: number;
  bloquesTajados?: number;
  bloquesTajadosDeFabrica?: number;
  estado?: EstadoLote;
  version?: number;
  deletedAt?: Date | null;
}

export class Lote {
  readonly id: string;
  readonly producto: TipoProducto;
  readonly fechaIngreso: Date;
  readonly proveedorId: string;
  readonly cantidadCompradaKg: Kilogramo;
  readonly precioCompraBaseKg: Dinero;
  readonly precioPorBloque: Dinero;
  readonly costoFlete: Dinero;
  readonly costoTajado: Dinero;
  readonly costoEmpaques: Dinero;
  readonly costoRealCalculadoKg: Dinero;
  readonly stockDisponibleKg: Kilogramo;
  readonly bloquesEnteros: number;
  readonly bloquesTajados: number;
  readonly bloquesTajadosDeFabrica: number;
  readonly estado: EstadoLote;
  readonly version: number;
  readonly deletedAt: Date | null;

  constructor(props: LoteProps) {
    this.id = props.id ?? '';
    this.producto = props.producto;
    this.fechaIngreso = props.fechaIngreso ?? new Date();
    this.proveedorId = props.proveedorId;
    this.deletedAt = props.deletedAt ?? null;

    // Block-based fields — default to 0 for SEMISALADO or when not provided
    this.bloquesEnteros = props.bloquesEnteros ?? 0;
    this.bloquesTajados = props.bloquesTajados ?? 0;
    this.bloquesTajadosDeFabrica = props.bloquesTajadosDeFabrica ?? 0;

    // cantidadCompradaKg is always explicitly provided
    // For DOBLE_CREMA creation, the use case calculates it from bloques
    this.cantidadCompradaKg = new Kilogramo(props.cantidadCompradaKg);
    this.precioCompraBaseKg = new Dinero(props.precioCompraBaseKg);
    this.precioPorBloque = new Dinero(props.precioPorBloque ?? '0');
    this.costoFlete = new Dinero(props.costoFlete ?? '0');
    this.costoTajado = new Dinero(props.costoTajado ?? '0');
    this.costoEmpaques = new Dinero(props.costoEmpaques ?? '0');

    this.validate();

    // Costo_Real_Por_Kg = (Precio_Base × Cantidad + Flete + Tajado + Empaques) / Cantidad
    this.costoRealCalculadoKg = this.calculateCostoReal();

    this.stockDisponibleKg = props.stockDisponibleKg
      ? new Kilogramo(props.stockDisponibleKg)
      : this.cantidadCompradaKg;

    this.estado = props.estado ?? EstadoLote.ACTIVO;
    this.version = props.version ?? 0;
  }

  /**
   * Costo_Real_Por_Kg = (Precio_Base × Cantidad + Flete + Tajado + Empaques) / Cantidad
   */
  private calculateCostoReal(): Dinero {
    const costoBaseTotal = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
    const costoTotal = costoBaseTotal
      .add(this.costoFlete)
      .add(this.costoTajado)
      .add(this.costoEmpaques);
    return costoTotal.divide(this.cantidadCompradaKg.value);
  }

  private validate(): void {
    if (!this.proveedorId) {
      throw new Error('Lote proveedorId is required');
    }
    if (this.cantidadCompradaKg.isZero()) {
      throw new Error('Lote cantidadCompradaKg cannot be zero');
    }
    if (this.precioCompraBaseKg.isNegative()) {
      throw new Error('Lote precioCompraBaseKg cannot be negative');
    }
  }

  /**
   * Register a tajado (cutting) operation on this Lote.
   * Decrements bloquesEnteros, increments bloquesTajados, adds to costoTajado,
   * and recalculates costoRealCalculadoKg.
   * Returns a new Lote with updated values.
   */
  registrarTajado(cantidadBloques: number, precioPorBloque: string): Lote {
    if (this.producto !== TipoProducto.DOBLE_CREMA) {
      throw new Error('Solo se puede registrar tajado en lotes de Doble Crema');
    }
    if (this.deletedAt) {
      throw new Error('No se puede registrar tajado en un lote eliminado');
    }
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('No se puede registrar tajado en un lote agotado');
    }
    if (cantidadBloques <= 0) {
      throw new Error('La cantidad de bloques debe ser mayor a 0');
    }
    if (this.bloquesEnteros < cantidadBloques) {
      throw new Error(`No hay suficientes bloques enteros. Disponibles: ${this.bloquesEnteros}, solicitados: ${cantidadBloques}`);
    }

    const precioPorBloqueDinero = new Dinero(precioPorBloque);
    const costoTajadoAdicional = precioPorBloqueDinero.multiply(cantidadBloques);
    const nuevoCostoTajado = this.costoTajado.add(costoTajadoAdicional);

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: nuevoCostoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros - cantidadBloques,
      bloquesTajados: this.bloquesTajados + cantidadBloques,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: this.estado,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Deduct stock from this Lote by kilograms (for granel/partial sales).
   * For Doble Crema lotes, recalculates bloquesEnteros after deduction.
   * Automatically transitions to AGOTADO if stock reaches zero.
   */
  deductStock(cantidad: Kilogramo): Lote {
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('Cannot deduct stock from an AGOTADO Lote');
    }
    if (cantidad.greaterThan(this.stockDisponibleKg)) {
      throw new Error(
        `Insufficient stock: requested ${cantidad.value} Kg, available ${this.stockDisponibleKg.value} Kg`
      );
    }

    const newStock = this.stockDisponibleKg.subtract(cantidad);
    const newEstado = newStock.isZero() ? EstadoLote.AGOTADO : this.estado;

    // For Doble Crema, recalculate bloquesEnteros after stock deduction
    // Partial kg sales can reduce the number of complete blocks available
    let newBloquesEnteros = this.bloquesEnteros;
    if (this.producto === TipoProducto.DOBLE_CREMA) {
      newBloquesEnteros = Math.floor(Number(newStock.value) / 2.5);
    }

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: newStock.value,
      bloquesEnteros: newBloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: newEstado,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Deduct stock from this Lote by whole blocks (for mayorista block sales).
   * Only valid for Doble Crema lotes.
   * Decrements bloquesEnteros by the block count and stockDisponibleKg by the kg equivalent.
   * Automatically transitions to AGOTADO if stock reaches zero.
   */
  deductStockByBlocks(cantidadBloques: number): Lote {
    if (this.producto !== TipoProducto.DOBLE_CREMA) {
      throw new Error('Block deduction is only valid for Doble Crema lotes');
    }
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('Cannot deduct stock from an AGOTADO Lote');
    }
    if (cantidadBloques <= 0) {
      throw new Error('Block quantity must be greater than 0');
    }
    if (!Number.isInteger(cantidadBloques)) {
      throw new Error('Block quantity must be a whole number');
    }
    if (this.bloquesEnteros < cantidadBloques) {
      throw new Error(
        `Insufficient blocks: requested ${cantidadBloques}, available ${this.bloquesEnteros}`
      );
    }

    const kgDeducted = new Kilogramo(String(cantidadBloques * 2.5));
    if (kgDeducted.greaterThan(this.stockDisponibleKg)) {
      throw new Error(
        `Insufficient stock: requested ${kgDeducted.value} Kg (${cantidadBloques} blocks), available ${this.stockDisponibleKg.value} Kg`
      );
    }

    const newStock = this.stockDisponibleKg.subtract(kgDeducted);
    const newBloquesEnteros = this.bloquesEnteros - cantidadBloques;
    const newEstado = newStock.isZero() ? EstadoLote.AGOTADO : this.estado;

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: newStock.value,
      bloquesEnteros: newBloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: newEstado,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Transition status to AGOTADO. Used by infrastructure when stock hits zero.
   */
  markAsAgotado(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: EstadoLote.AGOTADO,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Update cost fields and recalculate costoRealCalculadoKg.
   * Does NOT change producto, proveedorId, or version (version increment happens at repo level).
   */
  updateCosts(params: {
    precioCompraBaseKg?: string;
    precioPorBloque?: string;
    cantidadCompradaKg?: string;
    costoFlete?: string;
    costoTajado?: string;
    costoEmpaques?: string;
  }): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: params.cantidadCompradaKg ?? this.cantidadCompradaKg.value,
      precioCompraBaseKg: params.precioCompraBaseKg ?? this.precioCompraBaseKg.value,
      precioPorBloque: params.precioPorBloque ?? this.precioPorBloque.value,
      costoFlete: params.costoFlete ?? this.costoFlete.value,
      costoTajado: params.costoTajado ?? this.costoTajado.value,
      costoEmpaques: params.costoEmpaques ?? this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: this.estado,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: this.estado,
      version: this.version,
      deletedAt: new Date(),
    });
  }

  restore(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloque: this.precioPorBloque.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      estado: this.estado,
      version: this.version,
      deletedAt: null,
    });
  }
}