// Port: LoteRepository — interface only, no infrastructure imports
import { Lote } from '../entities/Lote';

export interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
  findActive(): Promise<Lote[]>;
  findByProveedor(proveedorId: string): Promise<Lote[]>;
  save(lote: Lote): Promise<Lote>;
  deductStock(id: string, cantidadKg: string, expectedVersion: number): Promise<Lote>;
}