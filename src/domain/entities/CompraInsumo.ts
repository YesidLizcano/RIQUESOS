// Entity: CompraInsumo — insumo purchase record
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { CategoriaInsumo } from '../enums';

export { CategoriaInsumo };

export interface CompraInsumoProps {
  id?: string;
  empaqueId: string;
  categoria: CategoriaInsumo;
  cantidad: string; // Decimal string
  cantidadRestante?: string; // Decimal string, defaults to cantidad if not provided
  precioUnitario: string; // Decimal string
  costoTotal?: string; // Calculated: cantidad × precioUnitario
  fecha?: Date;
}

export class CompraInsumo {
  readonly id: string;
  readonly empaqueId: string;
  readonly categoria: CategoriaInsumo;
  readonly cantidad: Dinero;
  readonly cantidadRestante: Dinero;
  readonly precioUnitario: Dinero;
  readonly costoTotal: Dinero;
  readonly fecha: Date;

  constructor(props: CompraInsumoProps) {
    this.id = props.id ?? '';
    this.empaqueId = props.empaqueId;
    this.categoria = props.categoria;
    this.cantidad = new Dinero(props.cantidad);
    this.precioUnitario = new Dinero(props.precioUnitario);
    // Default cantidadRestante to cantidad if not provided (new purchase = fully in stock)
    this.cantidadRestante = props.cantidadRestante !== undefined
      ? new Dinero(props.cantidadRestante)
      : this.cantidad;
    this.fecha = props.fecha ?? new Date();

    // costoTotal = cantidad × precioUnitario (or override if provided)
    if (props.costoTotal !== undefined) {
      this.costoTotal = new Dinero(props.costoTotal);
    } else {
      this.costoTotal = this.cantidad.multiply(this.precioUnitario.value);
    }

    this.validate();
  }

  /**
   * Deduct quantity from this lot's remaining stock.
   * Returns a new CompraInsumo with reduced cantidadRestante.
   * Throws if trying to deduct more than available.
   */
  deduct(cantidad: string): CompraInsumo {
    const cantidadDinero = new Dinero(cantidad);
    if (cantidadDinero.greaterThan(this.cantidadRestante)) {
      throw new Error(
        `Stock insuficiente en lote: solicitado ${cantidadDinero.value}, disponible ${this.cantidadRestante.value}`
      );
    }
    return new CompraInsumo({
      id: this.id,
      empaqueId: this.empaqueId,
      categoria: this.categoria,
      cantidad: this.cantidad.value,
      cantidadRestante: this.cantidadRestante.subtract(cantidadDinero).value,
      precioUnitario: this.precioUnitario.value,
      costoTotal: this.costoTotal.value,
      fecha: this.fecha,
    });
  }

  private validate(): void {
    if (!this.empaqueId) {
      throw new Error('El empaque es obligatorio');
    }
    if (this.cantidad.isZero()) {
      throw new Error('La cantidad debe ser mayor a 0');
    }
    if (this.cantidad.isNegative()) {
      throw new Error('La cantidad no puede ser negativa');
    }
    if (this.precioUnitario.isNegative()) {
      throw new Error('El precio unitario no puede ser negativo');
    }
    if (this.cantidadRestante.isNegative()) {
      throw new Error('La cantidad restante no puede ser negativa');
    }
  }
}