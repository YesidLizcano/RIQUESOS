// Use Case: ModificarLote — update cost fields with optimistic locking
// Application layer: can import from Domain but NOT from Infrastructure
import { Lote } from '../../domain/entities/Lote';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import { TipoProducto } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export interface ModificarLoteInput {
  id: string;
  version: number;
  precioCompraBaseKg?: string;
  precioPorBloque?: string;
  cantidadCompradaKg?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
}

export class ModificarLote {
  constructor(private readonly loteRepo: LoteRepository) {}

  async execute(input: ModificarLoteInput): Promise<Lote> {
    const existing = await this.loteRepo.findById(input.id);
    if (!existing) {
      throw new Error(`Lote not found: ${input.id}`);
    }

    if (existing.version !== input.version) {
      throw new ConcurrencyError(
        `Lote ${input.id} was modified by another transaction (expected version ${input.version}, current version ${existing.version})`
      );
    }

    // Doble Crema block constraint: if updating quantity, validate block multiple
    if (existing.producto === TipoProducto.DOBLE_CREMA && input.cantidadCompradaKg !== undefined) {
      const cantidad = Number(input.cantidadCompradaKg);
      const remainder = Number((cantidad / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      if (Math.abs(remainder) >= 0.001) {
        throw new Error('Para Doble Crema, la cantidad debe ser múltiplo de 2.5 kg');
      }
    }

    // For Doble Crema: if precioPorBloque is provided, recalculate precioCompraBaseKg
    let precioCompraBaseKg = input.precioCompraBaseKg ?? existing.precioCompraBaseKg.value;
    if (existing.producto === TipoProducto.DOBLE_CREMA && input.precioPorBloque !== undefined) {
      precioCompraBaseKg = String(Number(input.precioPorBloque) / DOBLE_CREMA_BLOCK_KG);
    }

    const updated = existing.updateCosts({
      precioCompraBaseKg,
      precioPorBloque: input.precioPorBloque,
      cantidadCompradaKg: input.cantidadCompradaKg,
      costoFlete: input.costoFlete,
      costoTajado: input.costoTajado,
      costoEmpaques: input.costoEmpaques,
    });

    return this.loteRepo.updateCosts(input.id, updated, input.version);
  }
}