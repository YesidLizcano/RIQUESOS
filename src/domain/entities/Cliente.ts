// Entity: Cliente — type enum, pricing rules
// No external imports from infrastructure or frameworks

import { TipoCliente, TipoProducto } from '../enums';
import { Dinero } from '../value-objects/Dinero';

export interface ClienteProps {
  id?: string;
  nombre: string;
  tipo: TipoCliente;
  precioDobleCrema?: string;
  precioSemisalado?: string;
}

export class Cliente {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoCliente;
  readonly precioDobleCrema: Dinero | null;
  readonly precioSemisalado: Dinero | null;

  constructor(props: ClienteProps) {
    this.id = props.id ?? '';
    this.nombre = props.nombre;
    this.tipo = props.tipo;
    this.precioDobleCrema = props.precioDobleCrema ? new Dinero(props.precioDobleCrema) : null;
    this.precioSemisalado = props.precioSemisalado ? new Dinero(props.precioSemisalado) : null;

    this.validate();
  }

  private validate(): void {
    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Cliente nombre is required');
    }
    if (!Object.values(TipoCliente).includes(this.tipo)) {
      throw new Error(`Invalid TipoCliente: ${this.tipo}`);
    }
  }

  /**
   * Resolve the price for a given product type based on client type and custom prices.
   * MAYORISTA: uses custom price if defined, otherwise falls back to standard price.
   * MINORISTA: always uses standard price.
   */
  resolvePrecio(producto: TipoProducto, standardPrice: Dinero): Dinero {
    if (this.tipo === TipoCliente.MAYORISTA) {
      const customPrice = producto === TipoProducto.DOBLE_CREMA
        ? this.precioDobleCrema
        : this.precioSemisalado;

      if (customPrice !== null) {
        return customPrice;
      }
    }
    // MINORISTA or MAYORISTA without custom price → standard price
    return standardPrice;
  }

  updateNombre(nombre: string): Cliente {
    return new Cliente({
      id: this.id,
      nombre,
      tipo: this.tipo,
      precioDobleCrema: this.precioDobleCrema?.value,
      precioSemisalado: this.precioSemisalado?.value,
    });
  }

  updatePrecio(producto: TipoProducto, precio: string): Cliente {
    return new Cliente({
      id: this.id,
      nombre: this.nombre,
      tipo: this.tipo,
      precioDobleCrema: producto === TipoProducto.DOBLE_CREMA ? precio : this.precioDobleCrema?.value,
      precioSemisalado: producto === TipoProducto.SEMISALADO ? precio : this.precioSemisalado?.value,
    });
  }
}