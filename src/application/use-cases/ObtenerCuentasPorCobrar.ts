// Use Case: ObtenerCuentasPorCobrar — list outstanding credit sales with saldo > 0
import type { VentaRepository } from '../../domain/ports/VentaRepository';

export interface CuentaPorCobrar {
  ventaId: string;
  clienteNombre: string;
  sedeNombre?: string;
  fecha: string;
  ingresoTotal: string;
  abono: string;
  saldo: string;
}

export class ObtenerCuentasPorCobrar {
  constructor(private readonly ventaRepo: VentaRepository) {}

  async execute(inicio: Date, fin: Date): Promise<CuentaPorCobrar[]> {
    const results = await this.ventaRepo.findCuentasPorCobrar(inicio, fin);
    return results.map(r => ({
      ventaId: r.ventaId,
      clienteNombre: r.clienteNombre,
      sedeNombre: (r as any).sedeNombre ?? undefined,
      fecha: r.fecha.toISOString().slice(0, 10),
      ingresoTotal: r.ingresoTotal,
      abono: r.abono,
      saldo: r.saldo,
    }));
  }
}