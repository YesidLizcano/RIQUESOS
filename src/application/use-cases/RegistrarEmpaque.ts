// Use Case: RegistrarEmpaque — register an insumo purchase (add stock to existing or create new)
// Also creates a CompraInsumo record for purchase history tracking
import { Empaque, type CategoriaInsumo } from '../../domain/entities/Empaque';
import { CompraInsumo } from '../../domain/entities/CompraInsumo';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';

export interface CrearEmpaqueInput {
  categoria: CategoriaInsumo;
  stock: string;
  precio: string;
}

export interface CrearEmpaqueOutput {
  empaque: Empaque;
  compra: CompraInsumo;
}

export class RegistrarEmpaque {
  constructor(
    private readonly empaqueRepo: EmpaqueRepository,
    private readonly compraRepo?: CompraInsumoRepository,
  ) {}

  async execute(input: CrearEmpaqueInput): Promise<CrearEmpaqueOutput> {
    // The tipo is derived from the categoria label
    const tipo = input.categoria === 'BOLSA' ? 'Bolsa' : 'Separador';

    // Check if an empaque of this categoria already exists
    const existing = await this.empaqueRepo.findByCategoria(input.categoria);
    const activeExisting = existing.find(e => e.deletedAt === null);

    if (activeExisting) {
      // Add stock to the existing empaque (FIFO: price comes from active lot, not PPC)
      const updated = activeExisting.addStock(input.stock);
      const saved = await this.empaqueRepo.update(activeExisting.id, updated);

      // Create CompraInsumo record for purchase history
      const compra = new CompraInsumo({
        empaqueId: activeExisting.id,
        categoria: input.categoria,
        cantidad: input.stock,
        precioUnitario: input.precio,
      });
      const savedCompra = this.compraRepo
        ? await this.compraRepo.save(compra)
        : compra;

      // Update empaque price to reflect the oldest active lot (FIFO)
      if (this.compraRepo) {
        const activeLots = await this.compraRepo.findActiveByEmpaqueId(activeExisting.id);
        if (activeLots.length > 0) {
          const activeLotPrice = activeLots[0].precioUnitario.value;
          const empaqueWithPrice = saved.updateDetails({ precio: activeLotPrice });
          await this.empaqueRepo.update(activeExisting.id, empaqueWithPrice);
          return { empaque: empaqueWithPrice, compra: savedCompra };
        }
      }

      return { empaque: saved, compra: savedCompra };
    }

    // Create a new empaque
    const empaque = new Empaque({
      tipo,
      categoria: input.categoria,
      stock: input.stock,
      precio: input.precio,
    });

    const saved = await this.empaqueRepo.save(empaque);

    // Create CompraInsumo record for purchase history
    const compra = new CompraInsumo({
      empaqueId: saved.id,
      categoria: input.categoria,
      cantidad: input.stock,
      precioUnitario: input.precio,
    });
    const savedCompra = this.compraRepo
      ? await this.compraRepo.save(compra)
      : compra;

    return { empaque: saved, compra: savedCompra };
  }
}