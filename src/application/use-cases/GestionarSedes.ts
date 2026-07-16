// Use Case: GestionarSedes — CRUD for Sede
// Application layer: can import from Domain but NOT from Infrastructure
import { Sede } from '../../domain/entities/Sede';
import type { SedeRepository } from '../../domain/ports/SedeRepository';

export interface CrearSedeInput {
  nombre: string;
  direccion?: string;
  telefono?: string;
  esPrincipal?: boolean;
  clienteId: string;
}

export interface ActualizarSedeInput {
  id: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  esPrincipal?: boolean;
}

export class GestionarSedes {
  constructor(private readonly sedeRepo: SedeRepository) {}

  async crear(input: CrearSedeInput): Promise<Sede> {
    const sede = new Sede({
      nombre: input.nombre,
      direccion: input.direccion,
      telefono: input.telefono,
      esPrincipal: input.esPrincipal ?? false,
      clienteId: input.clienteId,
    });
    return this.sedeRepo.save(sede);
  }

  async actualizar(input: ActualizarSedeInput): Promise<Sede> {
    const existing = await this.sedeRepo.findById(input.id);
    if (!existing) {
      throw new Error(`Sede not found: ${input.id}`);
    }

    let updated = existing;

    if (input.nombre !== undefined) {
      updated = updated.updateNombre(input.nombre);
    }

    if (input.direccion !== undefined) {
      updated = updated.updateDireccion(input.direccion);
    }

    if (input.telefono !== undefined) {
      updated = updated.updateTelefono(input.telefono);
    }

    if (input.esPrincipal !== undefined) {
      updated = updated.setPrincipal(input.esPrincipal);
    }

    return this.sedeRepo.save(updated);
  }

  async eliminar(id: string): Promise<void> {
    const existing = await this.sedeRepo.findById(id);
    if (!existing) {
      throw new Error(`Sede not found: ${id}`);
    }
    await this.sedeRepo.softDelete(id);
  }

  async restaurar(id: string): Promise<Sede> {
    const existing = await this.sedeRepo.findById(id);
    // Allow restoring even soft-deleted sedes
    if (!existing) {
      throw new Error(`Sede not found: ${id}`);
    }
    await this.sedeRepo.restore(id);
    const restored = await this.sedeRepo.findById(id);
    if (!restored) {
      throw new Error(`Sede not found after restore: ${id}`);
    }
    return restored;
  }

  async obtenerPorId(id: string): Promise<Sede | null> {
    return this.sedeRepo.findById(id);
  }

  async obtenerPorClienteId(clienteId: string): Promise<Sede[]> {
    return this.sedeRepo.findByClienteId(clienteId);
  }

  async obtenerTodos(): Promise<Sede[]> {
    return this.sedeRepo.findAll();
  }
}