// Port: GastoFijoRepository — interface only, no infrastructure imports
import { GastoFijo } from '../entities/GastoFijo';

export interface GastoFijoRepository {
  findById(id: string): Promise<GastoFijo | null>;
  findAll(): Promise<GastoFijo[]>;
  findByDateRange(inicio: Date, fin: Date): Promise<GastoFijo[]>;
  save(gasto: GastoFijo): Promise<GastoFijo>;
  delete(id: string): Promise<void>;
  sumByPeriod(inicio: Date, fin: Date): Promise<string>;
}