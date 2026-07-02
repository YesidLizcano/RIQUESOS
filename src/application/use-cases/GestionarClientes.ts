// Use Case: GestionarClientes — CRUD + pricing
// Application layer: can import from Domain but NOT from Infrastructure
import { Cliente, type ClienteProps } from '../../domain/entities/Cliente';
import { TipoCliente, TipoProducto } from '../../domain/enums';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export interface CrearClienteInput {
  nombre: string;
  tipo: TipoCliente;
  precioDobleCrema?: string;
  precioSemisalado?: string;
}

export interface ActualizarClienteInput {
  id: string;
  nombre?: string;
  precioDobleCrema?: string;
  precioSemisalado?: string;
}

export class GestionarClientes {
  constructor(private readonly clienteRepo: ClienteRepository) {}

  async crear(input: CrearClienteInput): Promise<Cliente> {
    const cliente = new Cliente({
      nombre: input.nombre,
      tipo: input.tipo,
      precioDobleCrema: input.precioDobleCrema,
      precioSemisalado: input.precioSemisalado,
    });
    return this.clienteRepo.save(cliente);
  }

  async obtenerPorId(id: string): Promise<Cliente | null> {
    return this.clienteRepo.findById(id);
  }

  async obtenerTodos(): Promise<Cliente[]> {
    return this.clienteRepo.findAll();
  }

  async actualizar(input: ActualizarClienteInput): Promise<Cliente> {
    const existing = await this.clienteRepo.findById(input.id);
    if (!existing) {
      throw new Error(`Cliente not found: ${input.id}`);
    }

    // Apply updates using domain methods
    let updated = existing;

    if (input.nombre !== undefined) {
      updated = updated.updateNombre(input.nombre);
    }

    if (input.precioDobleCrema !== undefined) {
      updated = updated.updatePrecio(TipoProducto.DOBLE_CREMA, input.precioDobleCrema);
    }

    if (input.precioSemisalado !== undefined) {
      updated = updated.updatePrecio(TipoProducto.SEMISALADO, input.precioSemisalado);
    }

    return this.clienteRepo.save(updated);
  }

  async eliminar(id: string): Promise<void> {
    const existing = await this.clienteRepo.findById(id);
    if (!existing) {
      throw new Error(`Cliente not found: ${id}`);
    }
    await this.clienteRepo.softDelete(id);
  }

  async restaurar(id: string): Promise<Cliente> {
    const existing = await this.clienteRepo.findById(id);
    if (!existing) {
      throw new Error(`Cliente not found: ${id}`);
    }
    await this.clienteRepo.restore(id);
    const restored = await this.clienteRepo.findById(id);
    if (!restored) {
      throw new Error(`Cliente not found after restore: ${id}`);
    }
    return restored;
  }
}