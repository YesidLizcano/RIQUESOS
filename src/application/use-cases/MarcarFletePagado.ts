// Use Case: MarcarFletePagado — mark a lote's flete as paid with a payment method
import { Lote } from '../../domain/entities/Lote';
import { MetodoPago } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export interface MarcarFletePagadoInput {
  loteId: string;
  metodoPago: MetodoPago;
}

export interface MarcarFletePagadoOutput {
  lote: Lote;
}

export class MarcarFletePagado {
  constructor(private readonly loteRepo: LoteRepository) {}

  async execute(input: MarcarFletePagadoInput): Promise<MarcarFletePagadoOutput> {
    const lote = await this.loteRepo.findById(input.loteId);
    if (!lote) throw new Error('Lote no encontrado');

    const updated = lote.marcarFletePagado(input.metodoPago);
    const savedLote = await this.loteRepo.updateCosts(input.loteId, updated, lote.version);
    return { lote: savedLote };
  }
}