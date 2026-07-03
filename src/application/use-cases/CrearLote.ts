// Use Case: CrearLote — create with cost calculation, block support for Doble Crema
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
  costoEmpaques?: string;
  bloquesEnteros?: number;
  bloquesTajadosDeFabrica?: number;
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

    // Build Lote props based on product type
    let loteProps: LoteProps;

    if (input.producto === TipoProducto.DOBLE_CREMA) {
      // Doble Crema: quantity derived from bloques
      const bloquesEnteros = input.bloquesEnteros ?? 0;
      const bloquesTajadosDeFabrica = input.bloquesTajadosDeFabrica ?? 0;

      if (bloquesEnteros + bloquesTajadosDeFabrica <= 0) {
        throw new Error('Para Doble Crema, debe ingresar al menos un bloque');
      }

      const cantidadKg = (bloquesEnteros + bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG;
      loteProps = {
        producto: input.producto,
        proveedorId: input.proveedorId,
        cantidadCompradaKg: String(cantidadKg),
        precioCompraBaseKg: input.precioCompraBaseKg,
        costoFlete: input.costoFlete,
        costoEmpaques: input.costoEmpaques,
        bloquesEnteros,
        bloquesTajadosDeFabrica,
        bloquesTajados: 0, // Initially no bloques tajados
      };
    } else {
      // Semisalado: quantity input in Kg
      if (!input.cantidadCompradaKg || Number(input.cantidadCompradaKg) <= 0) {
        throw new Error('Para Semisalado, la cantidad en Kg es obligatoria');
      }
      loteProps = {
        producto: input.producto,
        proveedorId: input.proveedorId,
        cantidadCompradaKg: input.cantidadCompradaKg,
        precioCompraBaseKg: input.precioCompraBaseKg,
        costoFlete: input.costoFlete,
        costoEmpaques: input.costoEmpaques,
        bloquesEnteros: 0,
        bloquesTajados: 0,
        bloquesTajadosDeFabrica: 0,
      };
    }

    // Create Lote entity — cost calculation happens in the constructor
    const lote = new Lote(loteProps);

    // Persist
    const saved = await this.loteRepo.save(lote);
    return { lote: saved };
  }
}