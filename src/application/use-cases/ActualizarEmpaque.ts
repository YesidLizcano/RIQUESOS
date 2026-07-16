// Use Case: ActualizarEmpaque — update stock and price of empaques (insumos)
import { Empaque, type CategoriaInsumo } from '../../domain/entities/Empaque';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export interface ActualizarEmpaqueInput {
  id: string;
  categoria?: CategoriaInsumo;
  stock?: string;
  precio?: string;
}

export interface ActualizarEmpaqueOutput {
  empaque: Empaque;
}

export class ActualizarEmpaque {
  constructor(private readonly empaqueRepo: EmpaqueRepository) {}

  async execute(input: ActualizarEmpaqueInput): Promise<ActualizarEmpaqueOutput> {
    const existing = await this.empaqueRepo.findById(input.id);
    if (!existing) {
      throw new Error(`Insumo no encontrado: ${input.id}`);
    }

    // Derive tipo from categoria
    const newCategoria = input.categoria ?? existing.categoria;
    const newTipo = newCategoria === 'BOLSA' ? 'Bolsa' : 'Separador';

    let updated = existing;

    if (input.stock !== undefined) {
      // Stock is a Decimal string — use Dinero for precise delta calculation
      const currentStock = new Dinero(existing.stock.value);
      const newStock = new Dinero(input.stock);
      const delta = newStock.subtract(currentStock);
      if (!delta.isNegative()) {
        updated = updated.addStock(delta.value);
      } else {
        // delta is negative, deduct the absolute value
        updated = updated.deduct(delta.value.replace('-', ''));
      }
    }

    if (input.precio || input.categoria) {
      updated = updated.updateDetails({
        tipo: newTipo,
        categoria: input.categoria,
        precio: input.precio,
      });
    }

    const saved = await this.empaqueRepo.update(input.id, updated);
    return { empaque: saved };
  }
}