// Port: TajadoRepository — interface only, no infrastructure imports
import { Tajado } from '../entities/Tajado';

export interface TajadoRepository {
  save(tajado: Tajado): Promise<Tajado>;
  findById(id: string): Promise<Tajado | null>;
  findByLoteId(loteId: string): Promise<Tajado[]>;
  findAll(): Promise<Tajado[]>;
  updateEstadoPago(id: string, estadoPago: string): Promise<Tajado>;
  /** Sum costoTotal of tajados where estadoPago = PENDIENTE */
  sumPendientePago(): Promise<string>;
}