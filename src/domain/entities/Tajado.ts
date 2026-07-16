// Entity: Tajado — represents a cutting (tajado) operation on a Doble Crema Lote
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { ESTADO_PAGO_TAJADO, type EstadoPagoTajado } from '../enums';

export interface TajadoProps {
  id?: string;
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  separadoresKg?: string;
  costoSeparadores?: string;
  recortesKg?: string;
  estadoPago?: EstadoPagoTajado;
  fecha?: Date;
}

export class Tajado {
  readonly id: string;
  readonly loteId: string;
  readonly cantidadBloques: number;
  readonly precioPorBloque: Dinero;
  readonly tajador: string;
  readonly costoTotal: Dinero;
  readonly separadoresKg: Dinero;
  readonly costoSeparadores: Dinero;
  readonly recortesKg: Dinero;
  readonly estadoPago: EstadoPagoTajado;
  readonly fecha: Date;

  constructor(props: TajadoProps) {
    this.id = props.id ?? '';
    this.loteId = props.loteId;
    this.cantidadBloques = props.cantidadBloques;
    this.precioPorBloque = new Dinero(props.precioPorBloque);
    this.fecha = props.fecha ?? new Date();
    this.costoTotal = this.precioPorBloque.multiply(this.cantidadBloques);
    this.tajador = props.tajador;
    this.separadoresKg = new Dinero(props.separadoresKg ?? '0');
    this.costoSeparadores = new Dinero(props.costoSeparadores ?? '0');
    this.recortesKg = new Dinero(props.recortesKg ?? '0');
    this.estadoPago = props.estadoPago ?? ESTADO_PAGO_TAJADO.PENDIENTE;

    // Validate
    if (this.cantidadBloques <= 0) {
      throw new Error('La cantidad de bloques debe ser mayor a 0');
    }
    if (!props.loteId) {
      throw new Error('El lote es obligatorio');
    }
    if (!props.precioPorBloque) {
      throw new Error('El precio por bloque es obligatorio');
    }
    if (!props.tajador || props.tajador.trim() === '') {
      throw new Error('El tajador es obligatorio');
    }
    if (this.separadoresKg.isNegative()) {
      throw new Error('Los kg de separadores no pueden ser negativos');
    }
    if (this.costoSeparadores.isNegative()) {
      throw new Error('El costo de separadores no puede ser negativo');
    }
    if (this.recortesKg.isNegative()) {
      throw new Error('Los kg de recortes no pueden ser negativos');
    }
  }

  /** Returns a new Tajado with estadoPago set to PAGADO (immutable update) */
  markAsPagado(): Tajado {
    return new Tajado({
      id: this.id,
      loteId: this.loteId,
      cantidadBloques: this.cantidadBloques,
      precioPorBloque: this.precioPorBloque.value,
      tajador: this.tajador,
      separadoresKg: this.separadoresKg.value,
      costoSeparadores: this.costoSeparadores.value,
      recortesKg: this.recortesKg.value,
      estadoPago: ESTADO_PAGO_TAJADO.PAGADO,
      fecha: this.fecha,
    });
  }
}