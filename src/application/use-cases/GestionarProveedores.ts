// Use Case: GestionarProveedores — CRUD for Proveedor
// Application layer: can import from Domain but NOT from Infrastructure
import { Proveedor, type ProveedorProps } from '../../domain/entities/Proveedor';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export interface CrearProveedorInput {
  nombre: string;
  telefono?: string;
}

export interface ActualizarProveedorInput {
  id: string;
  nombre?: string;
  telefono?: string;
}

export class GestionarProveedores {
  constructor(private readonly proveedorRepo: ProveedorRepository) {}

  async crear(input: CrearProveedorInput): Promise<Proveedor> {
    const proveedor = new Proveedor({
      nombre: input.nombre,
      telefono: input.telefono,
    });
    return this.proveedorRepo.save(proveedor);
  }

  async actualizar(input: ActualizarProveedorInput): Promise<Proveedor> {
    const existing = await this.proveedorRepo.findById(input.id);
    if (!existing) {
      throw new Error(`Proveedor not found: ${input.id}`);
    }

    let updated = existing;

    if (input.nombre !== undefined) {
      updated = updated.updateNombre(input.nombre);
    }

    if (input.telefono !== undefined) {
      updated = updated.updateTelefono(input.telefono);
    }

    return this.proveedorRepo.save(updated);
  }

  async eliminar(id: string): Promise<void> {
    const existing = await this.proveedorRepo.findById(id);
    if (!existing) {
      throw new Error(`Proveedor not found: ${id}`);
    }
    await this.proveedorRepo.delete(id);
  }

  async obtenerPorId(id: string): Promise<Proveedor | null> {
    return this.proveedorRepo.findById(id);
  }

  async obtenerTodos(): Promise<Proveedor[]> {
    return this.proveedorRepo.findAll();
  }
}