// Use Case: ActualizarEmpaque — update stock and price of empaques
import { Empaque } from '../../domain/entities/Empaque';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export interface ActualizarEmpaqueInput {
  id: string;
  tipo?: string;
  stock?: number;
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
      throw new Error(`Empaque not found: ${input.id}`);
    }

    // If tipo is being changed, check for duplicates
    if (input.tipo && input.tipo !== existing.tipo) {
      const byTipo = await this.empaqueRepo.findByTipo(input.tipo);
      if (byTipo) {
        throw new Error(`Ya existe un empaque de tipo "${input.tipo}"`);
      }
    }

    let updated = existing;

    if (input.stock !== undefined) {
      updated = updated.addStock(input.stock - updated.stock);
    }

    if (input.tipo || input.precio) {
      updated = updated.updateDetails({
        tipo: input.tipo,
        precio: input.precio,
      });
    }

    const saved = await this.empaqueRepo.update(input.id, updated);
    return { empaque: saved };
  }
}