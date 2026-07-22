// Entity: Cliente — type enum, pricing rules
// No external imports from infrastructure or frameworks

import { TipoCliente, TipoProducto } from '../enums';
import { Dinero } from '../value-objects/Dinero';

export type BlockType = 'entero' | 'tajado';

export interface ClienteProps {
  id?: string;
  nombre: string;
  tipo: TipoCliente;
  precioDobleCremaEntero?: string;
  precioDobleCremaTajado?: string;
  precioSemisalado?: string;
  valorDomicilio?: string;
  deletedAt?: Date | null;
}

export class Cliente {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoCliente;
  readonly precioDobleCremaEntero: Dinero | null;
  readonly precioDobleCremaTajado: Dinero | null;
  readonly precioSemisalado: Dinero | null;
  readonly valorDomicilio: Dinero;
  readonly deletedAt: Date | null;

  constructor(props: ClienteProps) {
    this.id = props.id ?? '';
    this.nombre = props.nombre;
    this.tipo = props.tipo;
    this.precioDobleCremaEntero = props.precioDobleCremaEntero ? new Dinero(props.precioDobleCremaEntero) : null;
    this.precioDobleCremaTajado = props.precioDobleCremaTajado ? new Dinero(props.precioDobleCremaTajado) : null;
    this.precioSemisalado = props.precioSemisalado ? new Dinero(props.precioSemisalado) : null;
    this.valorDomicilio = new Dinero(props.valorDomicilio ?? '0');
    this.deletedAt = props.deletedAt ?? null;

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
   * For DOBLE_CREMA, blockType determines which custom price to use:
   *   - 'entero': uses precioDobleCremaEntero, falls back to precioDobleCremaTajado, then standardPrice
   *   - 'tajado': uses precioDobleCremaTajado, falls back to precioDobleCremaEntero, then standardPrice
   *   - undefined: uses precioDobleCremaEntero (backward compatible)
   */
  resolvePrecio(producto: TipoProducto, standardPrice: Dinero, blockType?: BlockType): Dinero {
    if (this.tipo === TipoCliente.MAYORISTA) {
      if (producto === TipoProducto.DOBLE_CREMA) {
        if (blockType === 'tajado') {
          // For tajado: prefer tajado price, fall back to entero price, then standard
          if (this.precioDobleCremaTajado !== null) return this.precioDobleCremaTajado;
          if (this.precioDobleCremaEntero !== null) return this.precioDobleCremaEntero;
        } else {
          // For entero (or no blockType): prefer entero price, fall back to tajado price, then standard
          if (this.precioDobleCremaEntero !== null) return this.precioDobleCremaEntero;
          if (this.precioDobleCremaTajado !== null) return this.precioDobleCremaTajado;
        }
      } else if (producto === TipoProducto.SEMISALADO) {
        const customPrice = this.precioSemisalado;
        if (customPrice !== null) {
          return customPrice;
        }
      }
      // Unknown products: fall through to standard price
    }
    // MINORISTA or MAYORISTA without custom price → standard price
    return standardPrice;
  }

  updateNombre(nombre: string): Cliente {
    return new Cliente({
      id: this.id,
      nombre,
      tipo: this.tipo,
      precioDobleCremaEntero: this.precioDobleCremaEntero?.value,
      precioDobleCremaTajado: this.precioDobleCremaTajado?.value,
      precioSemisalado: this.precioSemisalado?.value,
      valorDomicilio: this.valorDomicilio.value,
      deletedAt: this.deletedAt,
    });
  }

  updatePrecio(producto: TipoProducto, precio: string): Cliente {
    return new Cliente({
      id: this.id,
      nombre: this.nombre,
      tipo: this.tipo,
      precioDobleCremaEntero: producto === TipoProducto.DOBLE_CREMA ? precio : this.precioDobleCremaEntero?.value,
      precioDobleCremaTajado: producto === TipoProducto.DOBLE_CREMA ? precio : this.precioDobleCremaTajado?.value,
      precioSemisalado: producto === TipoProducto.SEMISALADO ? precio : this.precioSemisalado?.value,
      valorDomicilio: this.valorDomicilio.value,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Cliente {
    return new Cliente({
      id: this.id,
      nombre: this.nombre,
      tipo: this.tipo,
      precioDobleCremaEntero: this.precioDobleCremaEntero?.value,
      precioDobleCremaTajado: this.precioDobleCremaTajado?.value,
      precioSemisalado: this.precioSemisalado?.value,
      valorDomicilio: this.valorDomicilio.value,
      deletedAt: new Date(),
    });
  }

  restore(): Cliente {
    return new Cliente({
      id: this.id,
      nombre: this.nombre,
      tipo: this.tipo,
      precioDobleCremaEntero: this.precioDobleCremaEntero?.value,
      precioDobleCremaTajado: this.precioDobleCremaTajado?.value,
      precioSemisalado: this.precioSemisalado?.value,
      valorDomicilio: this.valorDomicilio.value,
      deletedAt: null,
    });
  }
}