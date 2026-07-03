// Entity: Tajado — represents a cutting (tajado) operation on a Doble Crema Lote
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';

export interface TajadoProps {
  id?: string;
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  fecha?: Date;
}

export class Tajado {
  readonly id: string;
  readonly loteId: string;
  readonly cantidadBloques: number;
  readonly precioPorBloque: Dinero;
  readonly tajador: string;
  readonly costoTotal: Dinero;
  readonly fecha: Date;

  constructor(props: TajadoProps) {
    this.id = props.id ?? '';
    this.loteId = props.loteId;
    this.cantidadBloques = props.cantidadBloques;
    this.precioPorBloque = new Dinero(props.precioPorBloque);
    this.fecha = props.fecha ?? new Date();
    this.costoTotal = this.precioPorBloque.multiply(this.cantidadBloques);
    this.tajador = props.tajador;

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
  }
}