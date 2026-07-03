// Port: EmpaqueRepository — interface only, no infrastructure imports
import { Empaque } from '../entities/Empaque';

export interface EmpaqueRepository {
  save(empaque: Empaque): Promise<Empaque>;
  findById(id: string): Promise<Empaque | null>;
  findByTipo(tipo: string): Promise<Empaque | null>;
  findAll(): Promise<Empaque[]>;
  update(id: string, empaque: Empaque): Promise<Empaque>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findAllIncludeDeleted(): Promise<Empaque[]>;
}