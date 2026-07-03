// Use Case: CrearLote — create with cost calculation
// Application layer: can import from Domain but NOT from Infrastructure
import { Lote, type LoteProps } from '../../domain/entities/Lote';
import { EstadoLote, TipoProducto } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export interface CrearLoteInput {
  producto: TipoProducto;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
}

export interface CrearLoteOutput {
  lote: Lote;
}

export class CrearLote {
  constructor(
    private readonly loteRepo: LoteRepository,
    private readonly proveedorRepo: ProveedorRepository
  ) {}

  async execute(input: CrearLoteInput): Promise<CrearLoteOutput> {
    // Validate proveedor exists
    const proveedor = await this.proveedorRepo.findById(input.proveedorId);
    if (!proveedor) {
      throw new Error(`Proveedor not found: ${input.proveedorId}`);
    }

    // Doble Crema block constraint: quantity must be a multiple of 2.5 kg
    if (input.producto === TipoProducto.DOBLE_CREMA) {
      const cantidad = Number(input.cantidadCompradaKg);
      const remainder = Number((cantidad / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      if (Math.abs(remainder) >= 0.001) {
        throw new Error('Para Doble Crema, la cantidad debe ser múltiplo de 2.5 kg');
      }
    }

    // Create Lote entity — cost calculation happens in the constructor
    const lote = new Lote({
      producto: input.producto,
      proveedorId: input.proveedorId,
      cantidadCompradaKg: input.cantidadCompradaKg,
      precioCompraBaseKg: input.precioCompraBaseKg,
      costoFlete: input.costoFlete,
      costoTajado: input.costoTajado,
      costoEmpaques: input.costoEmpaques,
    });

    // Persist
    const saved = await this.loteRepo.save(lote);
    return { lote: saved };
  }
}