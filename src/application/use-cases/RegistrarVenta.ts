// Use Case: RegistrarVenta — atomic registration, price resolution, concurrency retry
// Application layer: can import from Domain but NOT from Infrastructure
import { Venta, type VentaTipo } from '../../domain/entities/Venta';
import { Lote } from '../../domain/entities/Lote';
import { Dinero } from '../../domain/value-objects/Dinero';
import { Kilogramo } from '../../domain/value-objects/Kilogramo';
import { TipoProducto, TipoCliente } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export interface RegistrarVentaInput {
  clienteId: string;
  loteId: string;
  cantidadVendidaKg: string;
  standardPricePerKg: string; // standard price for the product type
  valorDomicilio?: string;
  domiciliario?: string;
  ventaTipo?: VentaTipo;
}

export interface RegistrarVentaOutput {
  venta: Venta;
  lote: Lote;
}

const MAX_RETRIES = 3;

export class RegistrarVenta {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly loteRepo: LoteRepository,
    private readonly clienteRepo: ClienteRepository
  ) {}

  async execute(input: RegistrarVentaInput): Promise<RegistrarVentaOutput> {
    const ventaTipo: VentaTipo = input.ventaTipo ?? 'GRANEL';

    // 1. Validate Cliente exists
    const cliente = await this.clienteRepo.findById(input.clienteId);
    if (!cliente) {
      throw new Error(`Cliente not found: ${input.clienteId}`);
    }

    // 2. Validate Lote exists
    let lote = await this.loteRepo.findById(input.loteId);
    if (!lote) {
      throw new Error(`Lote not found: ${input.loteId}`);
    }

    // 2b. Validate ventaTipo against client and product rules
    if (lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'BLOQUES') {
      const cantidad = Number(input.cantidadVendidaKg);
      const bloques = cantidad / DOBLE_CREMA_BLOCK_KG;
      if (!Number.isInteger(bloques)) {
        throw new Error('Para venta por bloques, la cantidad debe ser múltiplo de 2.5 kg');
      }
    }

    // Doble Crema + Mayorista block constraint (legacy validation)
    if (lote.producto === TipoProducto.DOBLE_CREMA && cliente.tipo === TipoCliente.MAYORISTA && ventaTipo === 'BLOQUES') {
      const cantidad = Number(input.cantidadVendidaKg);
      const bloques = cantidad / DOBLE_CREMA_BLOCK_KG;
      if (!Number.isInteger(bloques)) {
        throw new Error('Para Doble Crema mayorista, la cantidad debe ser múltiplo de 2.5 kg');
      }
    }

    // 3. Resolve price based on cliente type
    const standardPrice = new Dinero(input.standardPricePerKg);
    const precioVentaKg = cliente.resolvePrecio(lote.producto, standardPrice);

    // 4. Create Venta entity (validates and calculates financials)
    const venta = new Venta({
      clienteId: input.clienteId,
      loteId: input.loteId,
      cantidadVendidaKg: input.cantidadVendidaKg,
      precioVentaKg: precioVentaKg.value,
      costoAplicadoKg: lote.costoRealCalculadoKg.value,
      valorDomicilio: input.valorDomicilio,
      domiciliario: input.domiciliario,
      ventaTipo,
    });

    // 5. Register atomically with retry on concurrency conflict
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Re-fetch lote for current version on each attempt
        lote = await this.loteRepo.findById(input.loteId);
        if (!lote) {
          throw new Error(`Lote not found: ${input.loteId}`);
        }

        const savedVenta = await this.ventaRepo.registrarVentaAtomico(
          venta,
          input.loteId,
          input.cantidadVendidaKg,
          lote.version,
          ventaTipo
        );

        // Re-fetch lote after transaction to return updated state
        const updatedLote = await this.loteRepo.findById(input.loteId);
        if (!updatedLote) {
          throw new Error(`Lote not found after transaction: ${input.loteId}`);
        }

        return { venta: savedVenta, lote: updatedLote };
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'ConcurrencyError' || error.message.includes('modified by another transaction'))
        ) {
          lastError = error;
          continue; // Retry with fresh version
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Venta registration failed after max retries');
  }
}