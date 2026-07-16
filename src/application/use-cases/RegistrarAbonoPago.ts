// Use Case: RegistrarAbonoPago — add a payment to a credit sale
import { AbonoPago } from '../../domain/entities/AbonoPago';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { AbonoPagoRepository } from '../../domain/ports/AbonoPagoRepository';

export interface RegistrarAbonoPagoInput {
  ventaId: string;
  monto: string;
  metodoPago: string;
  observacion?: string;
}

export interface RegistrarAbonoPagoOutput {
  abono: AbonoPago;
  saldoRestante: string;
}

export class RegistrarAbonoPago {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly abonoPagoRepo: AbonoPagoRepository,
  ) {}

  async execute(input: RegistrarAbonoPagoInput): Promise<RegistrarAbonoPagoOutput> {
    const result = await this.ventaRepo.findById(input.ventaId);
    if (!result) throw new Error(`Venta not found: ${input.ventaId}`);
    const venta = result.venta;

    const monto = new Dinero(input.monto);
    if (monto.isZero()) throw new Error('Monto must be greater than zero');
    if (monto.isNegative()) throw new Error('Monto cannot be negative');

    const existingAbonos = await this.abonoPagoRepo.findByVentaId(input.ventaId);
    const currentTotalAbonado = existingAbonos.reduce((sum, a) => sum.add(a.monto), Dinero.zero());
    const newTotalAbonado = currentTotalAbonado.add(monto);
    const saldoRestante = venta.ingresoTotal.subtract(newTotalAbonado);

    if (saldoRestante.isNegative()) {
      throw new Error(`El monto abonado ($${newTotalAbonado.value}) excede el ingreso total ($${venta.ingresoTotal.value})`);
    }

    const abono = new AbonoPago({
      ventaId: input.ventaId,
      monto: input.monto,
      metodoPago: input.metodoPago,
      observacion: input.observacion,
    });

    const saved = await this.abonoPagoRepo.save(abono);

    await this.ventaRepo.updateAbono(input.ventaId, newTotalAbonado.value);

    return {
      abono: saved,
      saldoRestante: saldoRestante.value,
    };
  }
}