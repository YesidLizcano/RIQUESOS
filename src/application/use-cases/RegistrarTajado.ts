// Use Case: RegistrarTajado — register a tajado (cutting) operation on a Doble Crema Lote
// Application layer: can import from Domain but NOT from Infrastructure
import { Tajado } from '../../domain/entities/Tajado';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export interface RegistrarTajadoInput {
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
}

export interface RegistrarTajadoOutput {
  tajado: Tajado;
  lote: import('../../domain/entities/Lote').Lote;
}

export class RegistrarTajado {
  constructor(
    private readonly tajadoRepo: TajadoRepository,
    private readonly loteRepo: LoteRepository,
  ) {}

  async execute(input: RegistrarTajadoInput): Promise<RegistrarTajadoOutput> {
    const lote = await this.loteRepo.findById(input.loteId);
    if (!lote) throw new Error(`Lote not found: ${input.loteId}`);

    if (lote.deletedAt) throw new Error('No se puede registrar tajado en un lote eliminado');
    if (lote.estado === 'AGOTADO') throw new Error('No se puede registrar tajado en un lote agotado');

    const updatedLote = lote.registrarTajado(input.cantidadBloques, input.precioPorBloque);

    const tajado = new Tajado({
      loteId: input.loteId,
      cantidadBloques: input.cantidadBloques,
      precioPorBloque: input.precioPorBloque,
      tajador: input.tajador,
    });

    const savedTajado = await this.tajadoRepo.save(tajado);
    const savedLote = await this.loteRepo.updateBlocks(input.loteId, updatedLote, lote.version);

    return { tajado: savedTajado, lote: savedLote };
  }
}