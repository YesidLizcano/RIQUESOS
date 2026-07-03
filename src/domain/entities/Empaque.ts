// Entity: Empaque — packaging inventory for reempacado
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';

export interface EmpaqueProps {
  id?: string;
  tipo: string;
  stock: number;
  precio: string;
  deletedAt?: Date | null;
}

export class Empaque {
  readonly id: string;
  readonly tipo: string;
  readonly stock: number;
  readonly precio: Dinero;
  readonly deletedAt: Date | null;

  constructor(props: EmpaqueProps) {
    this.id = props.id ?? '';
    this.tipo = props.tipo;
    this.stock = props.stock;
    this.precio = new Dinero(props.precio);
    this.deletedAt = props.deletedAt ?? null;
    this.validate();
  }

  private validate(): void {
    if (!this.tipo.trim()) throw new Error('El tipo de empaque es obligatorio');
    if (this.stock < 0) throw new Error('El stock no puede ser negativo');
    if (this.precio.isNegative()) throw new Error('El precio no puede ser negativo');
  }

  deduct(cantidad: number): Empaque {
    if (cantidad > this.stock) {
      throw new Error(`Stock insuficiente: solicitado ${cantidad}, disponible ${this.stock}`);
    }
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      stock: this.stock - cantidad,
      precio: this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  addStock(cantidad: number): Empaque {
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      stock: this.stock + cantidad,
      precio: this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  updateDetails(params: { tipo?: string; precio?: string }): Empaque {
    return new Empaque({
      id: this.id,
      tipo: params.tipo ?? this.tipo,
      stock: this.stock,
      precio: params.precio ?? this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Empaque {
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      stock: this.stock,
      precio: this.precio.value,
      deletedAt: new Date(),
    });
  }

  restore(): Empaque {
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      stock: this.stock,
      precio: this.precio.value,
      deletedAt: null,
    });
  }
}