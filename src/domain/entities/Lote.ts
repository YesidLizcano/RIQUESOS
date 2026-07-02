// Entity: Lote — cost calculation, status transition, version field
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
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  stockDisponibleKg?: string;
  estado?: EstadoLote;
  version?: number;
}

export class Lote {
  readonly id: string;
  readonly producto: TipoProducto;
  readonly fechaIngreso: Date;
  readonly proveedorId: string;
  readonly cantidadCompradaKg: Kilogramo;
  readonly precioCompraBaseKg: Dinero;
  readonly costoFlete: Dinero;
  readonly costoTajado: Dinero;
  readonly costoEmpaques: Dinero;
  readonly costoRealCalculadoKg: Dinero;
  readonly stockDisponibleKg: Kilogramo;
  readonly estado: EstadoLote;
  readonly version: number;

  constructor(props: LoteProps) {
    this.id = props.id ?? '';
    this.producto = props.producto;
    this.fechaIngreso = props.fechaIngreso ?? new Date();
    this.proveedorId = props.proveedorId;

    this.cantidadCompradaKg = new Kilogramo(props.cantidadCompradaKg);
    this.precioCompraBaseKg = new Dinero(props.precioCompraBaseKg);
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
   * Deduct stock from this Lote. Returns a new Lote with reduced stock.
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

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: newStock.value,
      estado: newEstado,
      version: this.version,
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
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      estado: EstadoLote.AGOTADO,
      version: this.version,
    });
  }
}