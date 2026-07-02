// Use Case: ObtenerMetricas — revenue, costs, profit, inventory, top clients
// Application layer: can import from Domain but NOT from Infrastructure
import { Dinero } from '../../domain/value-objects/Dinero';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { GastoFijoRepository } from '../../domain/ports/GastoFijoRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

export interface MetricasPeriodo {
  ingresoTotal: string;
  costoMercancia: string;
  gananciaBruta: string;
  gastosFijos: string;
  gananciaNeta: string;
}

export interface InventarioPorProducto {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface TopCliente {
  clienteId: string;
  nombre: string;
  ingresoTotal: string;
}

export interface MetricasDashboard {
  periodo: MetricasPeriodo;
  inventario: InventarioPorProducto[];
  topClientes: TopCliente[];
}

export class ObtenerMetricas {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly loteRepo: LoteRepository,
    private readonly gastoFijoRepo: GastoFijoRepository,
    private readonly clienteRepo: ClienteRepository
  ) {}

  async execute(inicio: Date, fin: Date, topN: number = 5): Promise<MetricasDashboard> {
    // 1. Financial metrics for the period
    const ingresoTotal = await this.ventaRepo.sumIngresosByPeriod(inicio, fin);
    const costoMercancia = await this.ventaRepo.sumCostosByPeriod(inicio, fin);
    const gastosFijosTotal = await this.gastoFijoRepo.sumByPeriod(inicio, fin);

    // Calculate using Dinero value objects for precision
    const ingreso = new Dinero(ingresoTotal);
    const costo = new Dinero(costoMercancia);
    const gastosFijos = new Dinero(gastosFijosTotal);

    const gananciaBruta = ingreso.subtract(costo);
    const gananciaNeta = gananciaBruta.subtract(gastosFijos);

    const periodo: MetricasPeriodo = {
      ingresoTotal: ingreso.value,
      costoMercancia: costo.value,
      gananciaBruta: gananciaBruta.value,
      gastosFijos: gastosFijos.value,
      gananciaNeta: gananciaNeta.value,
    };

    // 2. Inventory levels by product type (only ACTIVO lotes)
    const lotesActivos = await this.loteRepo.findActive();
    const inventarioMap = new Map<string, { stock: number; count: number }>();

    for (const lote of lotesActivos) {
      const producto = lote.producto;
      const existing = inventarioMap.get(producto);
      const stock = Number(lote.stockDisponibleKg.value);

      if (existing) {
        inventarioMap.set(producto, {
          stock: existing.stock + stock,
          count: existing.count + 1,
        });
      } else {
        inventarioMap.set(producto, { stock, count: 1 });
      }
    }

    const inventario: InventarioPorProducto[] = Array.from(inventarioMap.entries()).map(
      ([producto, data]) => ({
        producto,
        stockDisponibleKg: String(data.stock),
        lotesActivos: data.count,
      })
    );

    // 3. Top clients by revenue in the period
    const ventas = await this.ventaRepo.findByDateRange(inicio, fin);
    const clienteIngresos = new Map<string, string>();

    for (const venta of ventas) {
      const existing = clienteIngresos.get(venta.clienteId);
      if (existing) {
        const sum = new Dinero(existing).add(venta.ingresoTotal);
        clienteIngresos.set(venta.clienteId, sum.value);
      } else {
        clienteIngresos.set(venta.clienteId, venta.ingresoTotal.value);
      }
    }

    // Sort by revenue descending and take top N
    const sortedClientes = Array.from(clienteIngresos.entries())
      .sort((a, b) => {
        const diff = new Dinero(b[1]).subtract(new Dinero(a[1]));
        // positive = b > a, negative = a > b
        if (diff.isNegative()) return -1;
        if (diff.isZero()) return 0;
        return 1;
      })
      .slice(0, topN);

    // Resolve client names
    const topClientes: TopCliente[] = [];
    for (const [clienteId, ingreso] of sortedClientes) {
      const cliente = await this.clienteRepo.findById(clienteId);
      topClientes.push({
        clienteId,
        nombre: cliente?.nombre ?? 'Unknown',
        ingresoTotal: ingreso,
      });
    }

    return {
      periodo,
      inventario,
      topClientes,
    };
  }
}