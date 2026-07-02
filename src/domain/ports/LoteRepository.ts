// Port: LoteRepository — interface only, no infrastructure imports
import { Lote } from '../entities/Lote';

export interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
  findActive(): Promise<Lote[]>;
  findAll(): Promise<Lote[]>;
  findByProveedor(proveedorId: string): Promise<Lote[]>;
  save(lote: Lote): Promise<Lote>;
  deductStock(id: string, cantidadKg: string, expectedVersion: number): Promise<Lote>;
  updateCosts(id: string, lote: Lote, expectedVersion: number): Promise<Lote>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findAllIncludeDeleted(): Promise<Lote[]>;
}