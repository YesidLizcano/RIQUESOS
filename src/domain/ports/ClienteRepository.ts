// Port: ClienteRepository — interface only, no infrastructure imports
import { Cliente } from '../entities/Cliente';

export interface ClienteRepository {
  findById(id: string): Promise<Cliente | null>;
  findByIds(ids: string[]): Promise<Cliente[]>;
  findAll(): Promise<Cliente[]>;
  save(cliente: Cliente): Promise<Cliente>;
  delete(id: string): Promise<void>;
}