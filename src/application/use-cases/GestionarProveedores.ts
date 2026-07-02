// Use Case: GestionarProveedores — CRUD for Proveedor
// Application layer: can import from Domain but NOT from Infrastructure
import { Proveedor, type ProveedorProps } from '../../domain/entities/Proveedor';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export interface CrearProveedorInput {
  nombre: string;
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

  async obtenerPorId(id: string): Promise<Proveedor | null> {
    return this.proveedorRepo.findById(id);
  }

  async obtenerTodos(): Promise<Proveedor[]> {
    return this.proveedorRepo.findAll();
  }
}