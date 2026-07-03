// Port: TajadoRepository — interface only, no infrastructure imports
import { Tajado } from '../entities/Tajado';

export interface TajadoRepository {
  save(tajado: Tajado): Promise<Tajado>;
  findByLoteId(loteId: string): Promise<Tajado[]>;
}