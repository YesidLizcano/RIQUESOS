// Use Case: MarcarTajadoPagado — mark a tajado as PAGADO
// Application layer: can import from Domain but NOT from Infrastructure
import { Tajado } from '../../domain/entities/Tajado';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';
import { ESTADO_PAGO_TAJADO } from '../../domain/enums';

export class MarcarTajadoPagado {
  constructor(private readonly tajadoRepo: TajadoRepository) {}

  async execute(id: string): Promise<Tajado> {
    const tajado = await this.tajadoRepo.findById(id);
    if (!tajado) throw new Error('Tajado no encontrado');
    if (tajado.estadoPago === ESTADO_PAGO_TAJADO.PAGADO) {
      throw new Error('Este tajado ya está marcado como pagado');
    }
    return this.tajadoRepo.updateEstadoPago(id, ESTADO_PAGO_TAJADO.PAGADO);
  }
}