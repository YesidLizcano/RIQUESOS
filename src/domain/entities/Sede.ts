// Entity: Sede — branch/location belonging to a Cliente
// No external imports from infrastructure or frameworks

export interface SedeProps {
  id?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  esPrincipal?: boolean;
  clienteId: string;
  deletedAt?: Date | null;
}

export class Sede {
  readonly id: string;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly esPrincipal: boolean;
  readonly clienteId: string;
  readonly deletedAt: Date | null;

  constructor(props: SedeProps) {
    this.id = props.id ?? '';
    this.nombre = props.nombre;
    this.direccion = props.direccion ?? null;
    this.telefono = props.telefono ?? null;
    this.esPrincipal = props.esPrincipal ?? false;
    this.clienteId = props.clienteId;
    this.deletedAt = props.deletedAt ?? null;

    this.validate();
  }

  private validate(): void {
    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Sede nombre is required');
    }
    if (!this.clienteId) {
      throw new Error('Sede clienteId is required');
    }
  }

  updateNombre(nombre: string): Sede {
    return new Sede({
      id: this.id,
      nombre,
      direccion: this.direccion ?? undefined,
      telefono: this.telefono ?? undefined,
      esPrincipal: this.esPrincipal,
      clienteId: this.clienteId,
      deletedAt: this.deletedAt,
    });
  }

  updateDireccion(direccion: string): Sede {
    return new Sede({
      id: this.id,
      nombre: this.nombre,
      direccion,
      telefono: this.telefono ?? undefined,
      esPrincipal: this.esPrincipal,
      clienteId: this.clienteId,
      deletedAt: this.deletedAt,
    });
  }

  updateTelefono(telefono: string): Sede {
    return new Sede({
      id: this.id,
      nombre: this.nombre,
      direccion: this.direccion ?? undefined,
      telefono,
      esPrincipal: this.esPrincipal,
      clienteId: this.clienteId,
      deletedAt: this.deletedAt,
    });
  }

  setPrincipal(esPrincipal: boolean): Sede {
    return new Sede({
      id: this.id,
      nombre: this.nombre,
      direccion: this.direccion ?? undefined,
      telefono: this.telefono ?? undefined,
      esPrincipal,
      clienteId: this.clienteId,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Sede {
    return new Sede({
      id: this.id,
      nombre: this.nombre,
      direccion: this.direccion ?? undefined,
      telefono: this.telefono ?? undefined,
      esPrincipal: this.esPrincipal,
      clienteId: this.clienteId,
      deletedAt: new Date(),
    });
  }

  restore(): Sede {
    return new Sede({
      id: this.id,
      nombre: this.nombre,
      direccion: this.direccion ?? undefined,
      telefono: this.telefono ?? undefined,
      esPrincipal: this.esPrincipal,
      clienteId: this.clienteId,
      deletedAt: null,
    });
  }
}