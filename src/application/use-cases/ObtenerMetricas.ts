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
  ventasCount: number;
  clientesActivos: number;
  kgVendidos: string;
  margenBrutoPct: string;
  margenNetoPct: string;
}

export interface InventarioPorProducto {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface InventarioResumen {
  valorTotal: string;
  lotesActivos: number;
}

export interface TopCliente {
  clienteId: string;
  nombre: string;
  ingresoTotal: string;
}

export interface VentaDiaria {
  fecha: string;
  total: string;
}

export interface IngresoPorTipoCliente {
  tipo: string;
  total: string;
}

export interface MetricasDashboard {
  periodo: MetricasPeriodo;
  inventario: InventarioPorProducto[];
  inventarioResumen: InventarioResumen;
  topClientes: TopCliente[];
  ventasDiarias: VentaDiaria[];
  ingresosPorTipoCliente: IngresoPorTipoCliente[];
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

    // 2. Sales-derived metrics from ventas in the period
    const ventas = await this.ventaRepo.findByDateRange(inicio, fin);
    const ventasCount = ventas.length;
    const clientesActivos = new Set(ventas.map((v) => v.clienteId)).size;
    const kgVendidos = ventas.reduce(
      (sum, v) => sum.add(new Dinero(v.cantidadVendidaKg.value)),
      Dinero.zero()
    );

    // 3. Margin percentages (as strings, "N/A" if revenue is zero)
    const margenBrutoPct = ingreso.isZero()
      ? 'N/A'
      : gananciaBruta.divide(ingreso.value).multiply('100').value;
    const margenNetoPct = ingreso.isZero()
      ? 'N/A'
      : gananciaNeta.divide(ingreso.value).multiply('100').value;

    const periodo: MetricasPeriodo = {
      ingresoTotal: ingreso.value,
      costoMercancia: costo.value,
      gananciaBruta: gananciaBruta.value,
      gastosFijos: gastosFijos.value,
      gananciaNeta: gananciaNeta.value,
      ventasCount,
      clientesActivos,
      kgVendidos: kgVendidos.value,
      margenBrutoPct,
      margenNetoPct,
    };

    // 4. Inventory levels by product type (only ACTIVO lotes)
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

    // 5. Inventory value (sum of costoRealCalculadoKg × stockDisponibleKg for active lotes)
    let inventarioValor = Dinero.zero();
    for (const lote of lotesActivos) {
      const valorLote = lote.costoRealCalculadoKg.multiply(lote.stockDisponibleKg.value);
      inventarioValor = inventarioValor.add(valorLote);
    }

    const inventarioResumen: InventarioResumen = {
      valorTotal: inventarioValor.value,
      lotesActivos: lotesActivos.length,
    };

    // 6. Top clients by revenue in the period — batch resolve with findByIds
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

    // Batch resolve client names (N+1 fix)
    const topIds = sortedClientes.map(([id]) => id);
    const clientes = await this.clienteRepo.findByIds(topIds);
    const clienteMap = new Map(clientes.map((c) => [c.id, c.nombre]));

    const topClientes: TopCliente[] = sortedClientes.map(([clienteId, ingreso]) => ({
      clienteId,
      nombre: clienteMap.get(clienteId) ?? 'Unknown',
      ingresoTotal: ingreso,
    }));

    // 7. Daily sales trend — group ventas by date, fill gaps for days with zero sales
    const ventasDiariasMap = new Map<string, string>();

    /** Format a Date as YYYY-MM-DD using local timezone (avoids UTC shift from toISOString) */
    const toLocalDateKey = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    for (const venta of ventas) {
      const dateKey = toLocalDateKey(venta.fecha);
      const existing = ventasDiariasMap.get(dateKey);
      if (existing) {
        const sum = new Dinero(existing).add(venta.ingresoTotal);
        ventasDiariasMap.set(dateKey, sum.value);
      } else {
        ventasDiariasMap.set(dateKey, venta.ingresoTotal.value);
      }
    }

    // Fill gaps: iterate all days in the period range
    const ventasDiarias: VentaDiaria[] = [];
    const currentDay = new Date(inicio);
    currentDay.setHours(0, 0, 0, 0);
    const endDay = new Date(fin);
    endDay.setHours(0, 0, 0, 0);

    while (currentDay <= endDay) {
      const dateKey = toLocalDateKey(currentDay);
      ventasDiarias.push({
        fecha: dateKey,
        total: ventasDiariasMap.get(dateKey) ?? '0',
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // 8. Revenue by client type — join ventas with client tipo
    const allClientIds = Array.from(new Set(ventas.map((v) => v.clienteId)));
    const allClients = allClientIds.length > 0
      ? await this.clienteRepo.findByIds(allClientIds)
      : [];
    const allClienteMap = new Map(allClients.map((c) => [c.id, c]));

    const ingresosPorTipoMap = new Map<string, string>();
    for (const venta of ventas) {
      const cliente = allClienteMap.get(venta.clienteId);
      const tipo = cliente?.tipo ?? 'UNKNOWN';
      const existing = ingresosPorTipoMap.get(tipo);
      if (existing) {
        const sum = new Dinero(existing).add(venta.ingresoTotal);
        ingresosPorTipoMap.set(tipo, sum.value);
      } else {
        ingresosPorTipoMap.set(tipo, venta.ingresoTotal.value);
      }
    }

    const ingresosPorTipoCliente: IngresoPorTipoCliente[] = Array.from(
      ingresosPorTipoMap.entries()
    ).map(([tipo, total]) => ({ tipo, total }));

    return {
      periodo,
      inventario,
      inventarioResumen,
      topClientes,
      ventasDiarias,
      ingresosPorTipoCliente,
    };
  }
}