// Entity: Proveedor — no external imports from infrastructure or frameworks

export interface ProveedorProps {
  id?: string;
  nombre: string;
  telefono?: string;
  deletedAt?: Date | null;
}

export class Proveedor {
  readonly id: string;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly deletedAt: Date | null;

  constructor(props: ProveedorProps) {
    this.id = props.id ?? '';
    this.nombre = props.nombre;
    this.telefono = props.telefono ?? null;
    this.deletedAt = props.deletedAt ?? null;

    this.validate();
  }

  private validate(): void {
    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Proveedor nombre is required');
    }
  }

  updateNombre(nombre: string): Proveedor {
    return new Proveedor({ id: this.id, nombre, telefono: this.telefono ?? undefined, deletedAt: this.deletedAt });
  }

  updateTelefono(telefono: string): Proveedor {
    return new Proveedor({ id: this.id, nombre: this.nombre, telefono, deletedAt: this.deletedAt });
  }

  softDelete(): Proveedor {
    return new Proveedor({ id: this.id, nombre: this.nombre, telefono: this.telefono ?? undefined, deletedAt: new Date() });
  }

  restore(): Proveedor {
    return new Proveedor({ id: this.id, nombre: this.nombre, telefono: this.telefono ?? undefined, deletedAt: null });
  }
}