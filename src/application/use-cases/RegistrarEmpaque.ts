// Use Case: RegistrarEmpaque — simple CRUD for creating empaques
import { Empaque } from '../../domain/entities/Empaque';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export interface CrearEmpaqueInput {
  tipo: string;
  stock: number;
  precio: string;
}

export interface CrearEmpaqueOutput {
  empaque: Empaque;
}

export class RegistrarEmpaque {
  constructor(private readonly empaqueRepo: EmpaqueRepository) {}

  async execute(input: CrearEmpaqueInput): Promise<CrearEmpaqueOutput> {
    // Check if tipo already exists
    const existing = await this.empaqueRepo.findByTipo(input.tipo);
    if (existing) {
      throw new Error(`Ya existe un empaque de tipo "${input.tipo}"`);
    }

    const empaque = new Empaque({
      tipo: input.tipo,
      stock: input.stock,
      precio: input.precio,
    });

    const saved = await this.empaqueRepo.save(empaque);
    return { empaque: saved };
  }
}