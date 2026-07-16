// Port: CompraInsumoRepository — interface only, no infrastructure imports
import { CompraInsumo } from '../entities/CompraInsumo';

export interface CompraInsumoRepository {
  save(compra: CompraInsumo): Promise<CompraInsumo>;
  update(compra: CompraInsumo): Promise<CompraInsumo>;
  findByDateRange(inicio: Date, fin: Date): Promise<CompraInsumo[]>;
  findAll(): Promise<CompraInsumo[]>;
  findByEmpaqueId(empaqueId: string): Promise<CompraInsumo[]>;
  findActiveByEmpaqueId(empaqueId: string): Promise<CompraInsumo[]>;
}