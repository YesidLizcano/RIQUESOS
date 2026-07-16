// Port: SedeRepository — interface only, no infrastructure imports
import { Sede } from '../entities/Sede';

export interface SedeRepository {
  findById(id: string): Promise<Sede | null>;
  findByIds(ids: string[]): Promise<Sede[]>;
  findByClienteId(clienteId: string): Promise<Sede[]>;
  findAll(): Promise<Sede[]>;
  findActive(): Promise<Sede[]>;
  save(sede: Sede): Promise<Sede>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}