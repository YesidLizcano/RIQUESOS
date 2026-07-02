// Use Case: GestionarGastos — CRUD + monthly aggregation
// Application layer: can import from Domain but NOT from Infrastructure
import { GastoFijo, type GastoFijoProps } from '../../domain/entities/GastoFijo';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { GastoFijoRepository } from '../../domain/ports/GastoFijoRepository';

export interface CrearGastoInput {
  concepto: string;
  valor: string;
}

export interface ActualizarGastoInput {
  id: string;
  concepto?: string;
  valor?: string;
}

export interface GastoMensualResumen {
  total: string;
  gastos: GastoFijo[];
}

export class GestionarGastos {
  constructor(private readonly gastoRepo: GastoFijoRepository) {}

  async crear(input: CrearGastoInput): Promise<GastoFijo> {
    const gasto = new GastoFijo({
      concepto: input.concepto,
      valor: input.valor,
    });
    return this.gastoRepo.save(gasto);
  }

  async obtenerPorId(id: string): Promise<GastoFijo | null> {
    return this.gastoRepo.findById(id);
  }

  async obtenerTodos(): Promise<GastoFijo[]> {
    return this.gastoRepo.findAll();
  }

  async actualizar(input: ActualizarGastoInput): Promise<GastoFijo> {
    const existing = await this.gastoRepo.findById(input.id);
    if (!existing) {
      throw new Error(`GastoFijo not found: ${input.id}`);
    }

    let updated = existing;

    if (input.concepto !== undefined) {
      updated = updated.updateConcepto(input.concepto);
    }

    if (input.valor !== undefined) {
      updated = updated.updateValor(input.valor);
    }

    return this.gastoRepo.save(updated);
  }

  async eliminar(id: string): Promise<void> {
    const existing = await this.gastoRepo.findById(id);
    if (!existing) {
      throw new Error(`GastoFijo not found: ${id}`);
    }
    await this.gastoRepo.delete(id);
  }

  /**
   * Get monthly expense aggregation for a given period.
   * Returns total sum and individual items within the date range.
   */
  async resumenMensual(inicio: Date, fin: Date): Promise<GastoMensualResumen> {
    const total = await this.gastoRepo.sumByPeriod(inicio, fin);
    const gastos = await this.gastoRepo.findAll();

    // Filter gastos to the period
    const gastosEnPeriodo = gastos.filter((g) => {
      const fecha = g.fecha;
      return fecha >= inicio && fecha <= fin;
    });

    return {
      total,
      gastos: gastosEnPeriodo,
    };
  }
}