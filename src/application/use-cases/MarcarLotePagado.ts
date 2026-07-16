// Use Case: MarcarLotePagado — mark a pending lote as paid with a payment method
import { Lote } from '../../domain/entities/Lote';
import { MetodoPago } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export interface MarcarLotePagadoInput {
  loteId: string;
  metodoPago: string;
}

export interface MarcarLotePagadoOutput {
  lote: Lote;
}

export class MarcarLotePagado {
  constructor(private readonly loteRepo: LoteRepository) {}

  async execute(input: MarcarLotePagadoInput): Promise<MarcarLotePagadoOutput> {
    const metodoPago = Object.values(MetodoPago).includes(input.metodoPago as MetodoPago)
      ? (input.metodoPago as MetodoPago)
      : MetodoPago.EFECTIVO;

    const lote = await this.loteRepo.findById(input.loteId);
    if (!lote) throw new Error(`Lote not found: ${input.loteId}`);

    const updated = lote.marcarPagado(metodoPago);
    await this.loteRepo.save(updated);

    return { lote: updated };
  }
}