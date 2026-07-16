// Use Case: RegistrarCompraInsumo — register an insumo purchase and update empaque stock atomically
// Application layer: can import from Domain but NOT from Infrastructure
import { CompraInsumo } from '../../domain/entities/CompraInsumo';
import { CategoriaInsumo } from '../../domain/enums';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export interface RegistrarCompraInput {
  empaqueId: string;
  cantidad: string;
  precioUnitario: string;
}

export interface RegistrarCompraOutput {
  compra: CompraInsumo;
}

export class RegistrarCompraInsumo {
  constructor(
    private readonly compraRepo: CompraInsumoRepository,
    private readonly empaqueRepo: EmpaqueRepository,
  ) {}

  async execute(input: RegistrarCompraInput): Promise<RegistrarCompraOutput> {
    // 1. Find the empaque by id
    const empaque = await this.empaqueRepo.findById(input.empaqueId);
    if (!empaque) {
      throw new Error(`Insumo no encontrado: ${input.empaqueId}`);
    }

    // 2. Validate it is not deleted
    if (empaque.deletedAt) {
      throw new Error('No se puede registrar compra en un insumo eliminado');
    }

    // 3. Create CompraInsumo entity (calculates costoTotal, cantidadRestante defaults to cantidad)
    const compra = new CompraInsumo({
      empaqueId: input.empaqueId,
      categoria: empaque.categoria,
      cantidad: input.cantidad,
      precioUnitario: input.precioUnitario,
    });

    // 4. Add stock to empaque (without changing price — FIFO sets price via active lot)
    const updatedEmpaque = empaque.addStock(input.cantidad);

    // 5. Save compra and update empaque stock
    const savedCompra = await this.compraRepo.save(compra);
    await this.empaqueRepo.update(input.empaqueId, updatedEmpaque);

    // 6. Determine active lot price: oldest lot with cantidadRestante > 0
    const activeLots = await this.compraRepo.findActiveByEmpaqueId(input.empaqueId);
    if (activeLots.length > 0) {
      const activeLotPrice = activeLots[0].precioUnitario.value;
      const empaqueWithPrice = updatedEmpaque.updateDetails({ precio: activeLotPrice });
      await this.empaqueRepo.update(input.empaqueId, empaqueWithPrice);
    }

    return { compra: savedCompra };
  }
}