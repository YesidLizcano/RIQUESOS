// Entity: Empaque — insumo inventory (bolsas y separadores)
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { CategoriaInsumo } from '../enums';

export { CategoriaInsumo };

export interface EmpaqueProps {
  id?: string;
  tipo: string;
  categoria: CategoriaInsumo;
  stock: string; // Decimal string for kg support (separadores)
  precio: string;
  deletedAt?: Date | null;
}

export class Empaque {
  readonly id: string;
  readonly tipo: string;
  readonly categoria: CategoriaInsumo;
  readonly stock: Dinero; // Changed from number to Dinero for kg support
  readonly precio: Dinero;
  readonly deletedAt: Date | null;

  constructor(props: EmpaqueProps) {
    this.id = props.id ?? '';
    this.tipo = props.tipo;
    this.categoria = props.categoria;
    this.stock = new Dinero(props.stock);
    this.precio = new Dinero(props.precio);
    this.deletedAt = props.deletedAt ?? null;
    this.validate();
  }

  private validate(): void {
    if (!this.tipo.trim()) throw new Error('El tipo de insumo es obligatorio');
    if (this.stock.isNegative()) throw new Error('El stock no puede ser negativo');
    if (this.precio.isNegative()) throw new Error('El precio no puede ser negativo');
  }

  get isBolsa(): boolean {
    return this.categoria === 'BOLSA';
  }

  get isSeparador(): boolean {
    return this.categoria === 'SEPARADOR';
  }

  get stockDisplay(): string {
    return this.isBolsa ? String(Math.round(Number(this.stock.value))) : `${Number(this.stock.value).toLocaleString('es-AR')} kg`;
  }

  deduct(cantidad: string): Empaque {
    const cantidadDinero = new Dinero(cantidad);
    if (cantidadDinero.greaterThan(this.stock)) {
      throw new Error(`Stock insuficiente: solicitado ${cantidadDinero.value}, disponible ${this.stock.value}`);
    }
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      categoria: this.categoria,
      stock: this.stock.subtract(cantidadDinero).value,
      precio: this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  addStock(cantidad: string): Empaque {
    const cantidadDinero = new Dinero(cantidad);
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      categoria: this.categoria,
      stock: this.stock.add(cantidadDinero).value,
      precio: this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  updateDetails(params: { tipo?: string; categoria?: CategoriaInsumo; precio?: string }): Empaque {
    return new Empaque({
      id: this.id,
      tipo: params.tipo ?? this.tipo,
      categoria: params.categoria ?? this.categoria,
      stock: this.stock.value,
      precio: params.precio ?? this.precio.value,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Empaque {
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      categoria: this.categoria,
      stock: this.stock.value,
      precio: this.precio.value,
      deletedAt: new Date(),
    });
  }

  restore(): Empaque {
    return new Empaque({
      id: this.id,
      tipo: this.tipo,
      categoria: this.categoria,
      stock: this.stock.value,
      precio: this.precio.value,
      deletedAt: null,
    });
  }
}