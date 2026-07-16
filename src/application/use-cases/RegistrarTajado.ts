// Use Case: RegistrarTajado — register a tajado (cutting) operation on a Doble Crema Lote
// Application layer: can import from Domain but NOT from Infrastructure
import { Tajado } from '../../domain/entities/Tajado';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import { CategoriaInsumo } from '../../domain/enums';
import { Dinero } from '../../domain/value-objects/Dinero';
import { DeductInsumoFIFO } from './DeductInsumoFIFO';
import { RECORTES_DC_PERMANENT_LOT_ID } from '../../domain/constants';

export interface RegistrarTajadoInput {
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  separadoresKg?: string;
  recortesKg?: string;
}

export interface RegistrarTajadoOutput {
  tajado: Tajado;
  lote: import('../../domain/entities/Lote').Lote;
  recortesLote?: import('../../domain/entities/Lote').Lote;
}

export class RegistrarTajado {
  constructor(
    private readonly tajadoRepo: TajadoRepository,
    private readonly loteRepo: LoteRepository,
    private readonly empaqueRepo?: EmpaqueRepository,
    private readonly compraInsumoRepo?: CompraInsumoRepository,
  ) {}

  async execute(input: RegistrarTajadoInput): Promise<RegistrarTajadoOutput> {
    const lote = await this.loteRepo.findById(input.loteId);
    if (!lote) throw new Error(`Lote not found: ${input.loteId}`);

    if (lote.deletedAt) throw new Error('No se puede registrar tajado en un lote eliminado');
    if (lote.estado === 'AGOTADO') throw new Error('No se puede registrar tajado en un lote agotado');

    // Resolve separadores cost if provided — must happen BEFORE registrarTajado
    let separadoresKg = '0';
    let costoSeparadores = '0';

    if (input.separadoresKg && new Dinero(input.separadoresKg).greaterThan(Dinero.zero())) {
      if (!this.empaqueRepo || !this.compraInsumoRepo) {
        throw new Error('EmpaqueRepository and CompraInsumoRepository are required when separadoresKg > 0');
      }

      // Find the active SEPARADOR empaque
      const separadores = await this.empaqueRepo.findByCategoria(CategoriaInsumo.SEPARADOR);
      if (separadores.length === 0) {
        throw new Error('No hay separadores disponibles en inventario');
      }

      const separador = separadores[0];
      const separadoresDinero = new Dinero(input.separadoresKg);

      // Validate stock is sufficient
      if (separadoresDinero.greaterThan(separador.stock)) {
        throw new Error(
          `Stock insuficiente de separadores: disponible ${separador.stock.value} kg, solicitado ${input.separadoresKg} kg`
        );
      }

      // Deduct from separador empaque via FIFO
      const deductFIFO = new DeductInsumoFIFO(this.compraInsumoRepo, this.empaqueRepo);
      const fifoResult = await deductFIFO.execute({
        empaqueId: separador.id,
        cantidad: input.separadoresKg,
      });

      separadoresKg = input.separadoresKg;
      costoSeparadores = fifoResult.totalCost;
    }

    const updatedLote = lote.registrarTajado(input.cantidadBloques, input.precioPorBloque, costoSeparadores);

    const tajado = new Tajado({
      loteId: input.loteId,
      cantidadBloques: input.cantidadBloques,
      precioPorBloque: input.precioPorBloque,
      tajador: input.tajador,
      separadoresKg,
      costoSeparadores,
      recortesKg: input.recortesKg,
    });

    const savedTajado = await this.tajadoRepo.save(tajado);
    const savedLote = await this.loteRepo.updateBlocks(input.loteId, updatedLote, lote.version);

    // Accumulate recortes into the permanent lot if provided
    let recortesLote: import('../../domain/entities/Lote').Lote | undefined;
    if (input.recortesKg && Number(input.recortesKg) > 0) {
      const permanentLot = await this.loteRepo.findById(RECORTES_DC_PERMANENT_LOT_ID);
      if (!permanentLot) {
        throw new Error('Lote permanente de recortes no encontrado. Ejecute el seed para crearlo.');
      }
      recortesLote = await this.loteRepo.acumularRecortes(RECORTES_DC_PERMANENT_LOT_ID, input.recortesKg, permanentLot.version);
    }

    return { tajado: savedTajado, lote: savedLote, recortesLote };
  }
}