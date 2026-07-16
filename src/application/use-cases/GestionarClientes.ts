// Use Case: GestionarClientes — CRUD + pricing
// Application layer: can import from Domain but NOT from Infrastructure
import { Cliente, type ClienteProps } from '../../domain/entities/Cliente';
import { TipoCliente, TipoProducto } from '../../domain/enums';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export interface CrearClienteInput {
  nombre: string;
  tipo: TipoCliente;
  precioDobleCremaEntero?: string;
  precioDobleCremaTajado?: string;
  precioSemisalado?: string;
  valorDomicilio?: string;
}

export interface ActualizarClienteInput {
  id: string;
  nombre?: string;
  precioDobleCremaEntero?: string;
  precioDobleCremaTajado?: string;
  precioSemisalado?: string;
  valorDomicilio?: string;
}

export class GestionarClientes {
  constructor(private readonly clienteRepo: ClienteRepository) {}

  async crear(input: CrearClienteInput): Promise<Cliente> {
    const existing = await this.clienteRepo.findActiveByNombre(input.nombre);
    if (existing) {
      throw new Error(`Ya existe un cliente con el nombre "${input.nombre}"`);
    }
    const cliente = new Cliente({
      nombre: input.nombre,
      tipo: input.tipo,
      precioDobleCremaEntero: input.precioDobleCremaEntero,
      precioDobleCremaTajado: input.precioDobleCremaTajado,
      precioSemisalado: input.precioSemisalado,
      valorDomicilio: input.valorDomicilio,
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

    // Check nombre uniqueness if it's being changed
    if (input.nombre !== undefined && input.nombre !== existing.nombre) {
      const duplicate = await this.clienteRepo.findActiveByNombre(input.nombre);
      if (duplicate) {
        throw new Error(`Ya existe un cliente con el nombre "${input.nombre}"`);
      }
    }

    // Apply updates using domain methods
    let updated = existing;

    if (input.nombre !== undefined) {
      updated = updated.updateNombre(input.nombre);
    }

    if (input.precioDobleCremaEntero !== undefined) {
      updated = updated.updatePrecio(TipoProducto.DOBLE_CREMA, input.precioDobleCremaEntero);
    }

    if (input.precioDobleCremaTajado !== undefined) {
      // Update only the tajado price — need to preserve entero price
      // We use a special approach: create new Cliente with both prices set
      updated = new Cliente({
        id: updated.id,
        nombre: updated.nombre,
        tipo: updated.tipo,
        precioDobleCremaEntero: updated.precioDobleCremaEntero?.value,
        precioDobleCremaTajado: input.precioDobleCremaTajado,
        precioSemisalado: updated.precioSemisalado?.value,
        valorDomicilio: updated.valorDomicilio.value,
        deletedAt: updated.deletedAt,
      });
    }

    if (input.precioSemisalado !== undefined) {
      updated = updated.updatePrecio(TipoProducto.SEMISALADO, input.precioSemisalado);
    }

    if (input.valorDomicilio !== undefined) {
      updated = new Cliente({
        id: updated.id,
        nombre: updated.nombre,
        tipo: updated.tipo,
        precioDobleCremaEntero: updated.precioDobleCremaEntero?.value,
        precioDobleCremaTajado: updated.precioDobleCremaTajado?.value,
        precioSemisalado: updated.precioSemisalado?.value,
        valorDomicilio: input.valorDomicilio,
        deletedAt: updated.deletedAt,
      });
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