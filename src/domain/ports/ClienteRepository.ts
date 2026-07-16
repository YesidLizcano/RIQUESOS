// Port: ClienteRepository — interface only, no infrastructure imports
import { Cliente } from '../entities/Cliente';

export interface ClienteRepository {
  findById(id: string): Promise<Cliente | null>;
  findByIds(ids: string[]): Promise<Cliente[]>;
  findAll(): Promise<Cliente[]>;
  findActiveByNombre(nombre: string): Promise<Cliente | null>;
  save(cliente: Cliente): Promise<Cliente>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findDeleted(): Promise<Cliente[]>;
}