// Use Case: EliminarVenta — atomic deletion with stock reversal
// Application layer: can import from Domain but NOT from Infrastructure
import { CategoriaInsumo } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

const MAX_RETRIES = 3;

export interface EliminarVentaInput {
  ventaId: string;
}

export class EliminarVenta {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly loteRepo: LoteRepository,
    private readonly empaqueRepo: EmpaqueRepository,
  ) {}

  async execute(input: EliminarVentaInput): Promise<void> {
    // 1. Fetch the Venta with its items
    const result = await this.ventaRepo.findById(input.ventaId);
    if (!result) {
      throw new Error(`Venta not found: ${input.ventaId}`);
    }

    const { venta, items } = result;

    // 2. Build lote reversions and empaque reversions
    const loteReversions: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }> = [];

    const empaqueReversions: Array<{ empaqueId: string; quantity: number }> = [];

    // Group empaque deductions: we need to find the BOLSA empaque for bloquesReempacados
    let bolsaEmpaqueId: string | null = null;
    const totalReempacados = items.reduce((sum, item) => sum + item.bloquesReempacados, 0);

    if (totalReempacados > 0) {
      const empaques = await this.empaqueRepo.findByCategoria(CategoriaInsumo.BOLSA);
      if (empaques.length > 0) {
        bolsaEmpaqueId = empaques[0].id;
      }
    }

    for (const item of items) {
      // Fetch current lote version for optimistic locking
      const lote = await this.loteRepo.findById(item.loteId);
      if (!lote) {
        throw new Error(`Lote not found: ${item.loteId}`);
      }

      loteReversions.push({
        loteId: item.loteId,
        cantidadKg: item.cantidadKg.value,
        expectedVersion: lote.version,
        ventaTipo: item.ventaTipo,
        bloquesEnterosVendidos: item.bloquesEnterosVendidos,
        bloquesTajadosVendidos: item.bloquesTajadosVendidos,
        bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
        bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
        origenCorte: item.origenCorte as string | undefined,
        sueltosEnteroDelta: item.sueltosEnteroDelta,
        sueltosTajadoDelta: item.sueltosTajadoDelta,
      });

      // Empaque reversal: add back reempacado quantity
      if (item.bloquesReempacados > 0 && bolsaEmpaqueId) {
        // Check if we already have a reversal for this empaque
        const existing = empaqueReversions.find((e) => e.empaqueId === bolsaEmpaqueId);
        if (existing) {
          existing.quantity += item.bloquesReempacados;
        } else {
          empaqueReversions.push({
            empaqueId: bolsaEmpaqueId,
            quantity: item.bloquesReempacados,
          });
        }
      }
    }

    // 3. Execute with retry on concurrency conflict
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Re-fetch lote versions on each attempt
        const updatedReversions = await Promise.all(
          loteReversions.map(async (r) => {
            const lote = await this.loteRepo.findById(r.loteId);
            if (!lote) {
              throw new Error(`Lote not found: ${r.loteId}`);
            }
            return { ...r, expectedVersion: lote.version };
          })
        );

        await this.ventaRepo.eliminarVentaAtomico({
          ventaId: venta.id,
          loteReversions: updatedReversions,
          empaqueReversions,
        });

        return;
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'ConcurrencyError' || error.message.includes('modified by another transaction'))
        ) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Venta deletion failed after max retries');
  }
}