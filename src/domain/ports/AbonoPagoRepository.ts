import type { AbonoPago } from '../entities/AbonoPago';

export interface AbonoPagoRepository {
  save(abono: AbonoPago): Promise<AbonoPago>;
  findByVentaId(ventaId: string): Promise<AbonoPago[]>;
}