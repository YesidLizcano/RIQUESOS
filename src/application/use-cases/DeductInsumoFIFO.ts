// Use Case: DeductInsumoFIFO — deduct insumo stock using FIFO lot tracking
// Deducts from the oldest purchase lots first, updates lot remaining quantities,
// and updates the empaque's precio to reflect the active lot's price.
import { Dinero } from '../../domain/value-objects/Dinero';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

export interface DeductInsumoInput {
  empaqueId: string;
  cantidad: string;
}

export interface DeductInsumoOutput {
  totalCost: string;      // total cost of deducted units
  pricePerUnit: string;   // price of the active lot after deduction
}

export class DeductInsumoFIFO {
  constructor(
    private readonly compraRepo: CompraInsumoRepository,
    private readonly empaqueRepo: EmpaqueRepository,
  ) {}

  /**
   * Calculate FIFO cost without modifying any data.
   * Useful when the actual deduction happens inside an atomic transaction.
   */
  async calculateFifoCost(empaqueId: string, cantidad: string): Promise<string> {
    const cantidadDinero = new Dinero(cantidad);

    const empaque = await this.empaqueRepo.findById(empaqueId);
    if (!empaque) {
      throw new Error(`Insumo no encontrado: ${empaqueId}`);
    }

    if (cantidadDinero.greaterThan(empaque.stock)) {
      throw new Error(
        `Stock insuficiente: solicitado ${cantidadDinero.value}, disponible ${empaque.stock.value}`
      );
    }

    let activeLots = await this.compraRepo.findActiveByEmpaqueId(empaqueId);

    if (activeLots.length === 0 && !empaque.stock.isZero()) {
      // Use current empaque price as fallback (implicit lot)
      return empaque.precio.multiply(cantidad).value;
    }

    if (activeLots.length === 0) {
      throw new Error(`No hay stock disponible para el insumo: ${empaqueId}`);
    }

    let remaining = cantidadDinero;
    let totalCost = Dinero.zero();

    for (const lot of activeLots) {
      if (remaining.isZero()) break;

      const available = lot.cantidadRestante;
      if (!available.greaterThan(Dinero.zero())) continue;

      const deduction = available.lessThan(remaining)
        ? available
        : remaining;

      const lotCost = deduction.multiply(lot.precioUnitario.value);
      totalCost = totalCost.add(lotCost);

      remaining = remaining.subtract(deduction);
    }

    return totalCost.value;
  }

  async execute(input: DeductInsumoInput): Promise<DeductInsumoOutput> {
    const cantidad = new Dinero(input.cantidad);

    // 1. Find the empaque
    const empaque = await this.empaqueRepo.findById(input.empaqueId);
    if (!empaque) {
      throw new Error(`Insumo no encontrado: ${input.empaqueId}`);
    }

    // 2. Verify total stock is sufficient
    if (cantidad.greaterThan(empaque.stock)) {
      throw new Error(
        `Stock insuficiente: solicitado ${cantidad.value}, disponible ${empaque.stock.value}`
      );
    }

    // 3. Get active lots ordered by fecha ASC (oldest first = FIFO)
    let activeLots = await this.compraRepo.findActiveByEmpaqueId(input.empaqueId);

    // If no active lots exist but empaque has stock, create an implicit lot
    // This handles legacy data or seed data that pre-dates FIFO lot tracking
    if (activeLots.length === 0 && !empaque.stock.isZero()) {
      const CompraInsumo = (await import('../../domain/entities/CompraInsumo')).CompraInsumo;
      const implicitLot = new CompraInsumo({
        empaqueId: empaque.id,
        categoria: empaque.categoria,
        cantidad: empaque.stock.value,
        cantidadRestante: empaque.stock.value,
        precioUnitario: empaque.precio.value,
      });
      const savedLot = await this.compraRepo.save(implicitLot);
      activeLots = [savedLot];
    }

    if (activeLots.length === 0) {
      throw new Error(`No hay stock disponible para el insumo: ${input.empaqueId}`);
    }

    // 4. Deduct from lots in FIFO order
    let remaining = cantidad;
    let totalCost = Dinero.zero();
    const updatedLots = [];

    for (const lot of activeLots) {
      if (remaining.isZero()) break;

      const available = lot.cantidadRestante;

      if (!available.greaterThan(Dinero.zero())) continue;

      const deduction = available.lessThan(remaining)
        ? available   // Take all from this lot
        : remaining;  // Take what we need

      // Calculate cost for this deduction
      const lotCost = deduction.multiply(lot.precioUnitario.value);
      totalCost = totalCost.add(lotCost);

      // Deduct from the lot
      const updatedLot = lot.deduct(deduction.value);
      updatedLots.push(updatedLot);

      // Reduce remaining
      remaining = remaining.subtract(deduction);
    }

    // 5. Update all affected lots
    for (const updatedLot of updatedLots) {
      await this.compraRepo.update(updatedLot);
    }

    // 6. Deduct total from empaque stock
    const updatedEmpaque = empaque.deduct(input.cantidad);

    // 7. Update empaque precio to reflect the oldest active lot after deduction
    const remainingActiveLots = await this.compraRepo.findActiveByEmpaqueId(input.empaqueId);
    let pricePerUnit: string;
    if (remainingActiveLots.length > 0) {
      pricePerUnit = remainingActiveLots[0].precioUnitario.value;
    } else {
      // All lots exhausted — keep last known price (stock is 0 anyway)
      pricePerUnit = empaque.precio.value;
    }

    const finalEmpaque = updatedEmpaque.updateDetails({ precio: pricePerUnit });
    await this.empaqueRepo.update(input.empaqueId, finalEmpaque);

    return {
      totalCost: totalCost.value,
      pricePerUnit,
    };
  }
}