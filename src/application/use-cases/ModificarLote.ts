// Use Case: ModificarLote — update cost fields with optimistic locking
// Application layer: can import from Domain but NOT from Infrastructure
import { Lote } from '../../domain/entities/Lote';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import { TipoProducto, EstadoPagoLote, MetodoPago } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

export interface ModificarLoteInput {
  id: string;
  version: number;
  precioCompraBaseKg?: string;
  precioPorBloqueEntero?: string;
  precioPorBloqueTajado?: string;
  cantidadCompradaKg?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
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
      const cantidadKg = new Dinero(input.cantidadCompradaKg);
      // Use Dinero division to avoid float64 precision loss
      const blockRatio = cantidadKg.divide(String(DOBLE_CREMA_BLOCK_KG));
      // Check if the ratio is close enough to an integer (within 0.001)
      const remainder = blockRatio.value.split('.')[1]; // fractional part
      const fracPart = remainder ? parseFloat('0.' + remainder) : 0;
      if (fracPart >= 0.001 && fracPart <= 0.999) {
        throw new Error('Para Doble Crema, la cantidad debe ser múltiplo de 2.5 kg');
      }
    }

    // For Doble Crema: if precioPorBloqueEntero is provided, recalculate precioCompraBaseKg
    let precioCompraBaseKg = input.precioCompraBaseKg ?? existing.precioCompraBaseKg.value;
    if (existing.producto === TipoProducto.DOBLE_CREMA && input.precioPorBloqueEntero !== undefined) {
      precioCompraBaseKg = new Dinero(input.precioPorBloqueEntero).divide(String(DOBLE_CREMA_BLOCK_KG)).value;
    }

    const updated = existing.updateCosts({
      precioCompraBaseKg,
      precioPorBloqueEntero: input.precioPorBloqueEntero,
      precioPorBloqueTajado: input.precioPorBloqueTajado,
      cantidadCompradaKg: input.cantidadCompradaKg,
      costoFlete: input.costoFlete,
      costoTajado: input.costoTajado,
      costoEmpaques: input.costoEmpaques,
      estadoPago: input.estadoPago,
      metodoPagoLote: input.metodoPagoLote,
    });

    return this.loteRepo.updateCosts(input.id, updated, input.version);
  }
}