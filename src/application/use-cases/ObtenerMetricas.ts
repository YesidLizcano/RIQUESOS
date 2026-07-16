// Use Case: ObtenerMetricas — revenue, costs, profit, inventory, top clients
// Application layer: can import from Domain but NOT from Infrastructure
import { Dinero } from '../../domain/value-objects/Dinero';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';

import type { ClienteRepository } from '../../domain/ports/ClienteRepository';
import type { VentaItemRepository } from '../../domain/ports/VentaItemRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export interface MetricasPeriodo {
  ingresoTotal: string;
  costoMercancia: string;
  gananciaBruta: string;

  ventasCount: number;
  clientesActivos: number;
  kgVendidos: string;
  margenBrutoPct: string;
  /** DC enteros sold: whole blocks (BLOQUES) */
  volumenDobleCremaEnteros: number;
  /** DC tajados sold: whole blocks (BLOQUES) */
  volumenDobleCremaTajados: number;
  /** DC kg granel from ENTERO variety */
  volumenDobleCremaKgGranelEntero: string;
  /** DC kg granel from TAJADO variety */
  volumenDobleCremaKgGranelTajado: string;
  /** SS kg sold */
  volumenSemisaladoKg: string;
  /** Recortes DC kg sold */
  volumenRecortesKg: string;
}

export interface InventarioPorProducto {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface InventarioPorTipo {
  tipo: string;
  stockKg: string;
  lotes: number;
  bloquesEnteros: number;
  bloquesTajados: number;
  bloquesTajadosDeFabrica: number;
  sueltosEntero: string;
  sueltosTajado: string;
}

export interface InventarioResumen {
  valorTotal: string;
  lotesActivos: number;
}

export interface TopCliente {
  clienteId: string;
  nombre: string;
  tipo: string;
  ingresoTotal: string;
  dcBloques: number;   // total DC blocks sold (enteros + tajados)
  ssKg: number;        // total SS kg sold
}

export interface VentaDiaria {
  fecha: string;
  total: string;
}

export interface IngresoPorTipoCliente {
  tipo: string;
  total: string;
}

export interface DesglosePorProducto {
  producto: string;
  ingreso: string;
  costoAplicado: string;
  gananciaBruta: string;
  kgVendidos: string;
  ventasCount: number;
  dcEnteros: number;
  dcTajados: number;
  dcKgGranelEntero: string;
  dcKgGranelTajado: string;
}

export interface DesglosePorProveedor {
  proveedorId: string;
  proveedorNombre: string;
  ingreso: string;
  costoAplicado: string;
  gananciaBruta: string;
  kgVendidos: string;
  ventasCount: number;
  dcEnteros: number;
  dcTajados: number;
  dcKgGranelEntero: string;
  dcKgGranelTajado: string;
}

export interface FlujoDinero {
  efectivo: string;       // Sum of ingresoTotal where metodoPago = EFECTIVO
  bancos: string;         // Sum of ingresoTotal where metodoPago IN (NEQUI, BRE_B)
  cuentasPorCobrar: string; // Sum of saldo (ingresoTotal - abono) where metodoPago = CREDITO AND saldo > 0
}

export interface CuentasPorPagar {
  totalPendiente: string; // Sum of (cantidadCompradaKg * precioCompraBaseKg + costoFlete) for Lotes with estadoPago = PENDIENTE
  cantidadLotes: number;    // Count of Lotes with estadoPago = PENDIENTE
  tajadosPendientesPago: string; // Sum of costoTotal for Tajados with estadoPago = PENDIENTE
}

export interface MetricasDashboard {
  periodo: MetricasPeriodo;
  inventario: InventarioPorProducto[];
  inventarioResumen: InventarioResumen;
  inventarioPorTipo: InventarioPorTipo[];
  topClientes: TopCliente[];
  ventasDiarias: VentaDiaria[];
  ingresosPorTipoCliente: IngresoPorTipoCliente[];
  desglosePorProducto: DesglosePorProducto[];
  desglosePorProveedor: DesglosePorProveedor[];
  flujoDinero: FlujoDinero;
  cuentasPorPagar: CuentasPorPagar;
}

export class ObtenerMetricas {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly loteRepo: LoteRepository,
    private readonly clienteRepo: ClienteRepository,
    private readonly ventaItemRepo: VentaItemRepository,
    private readonly proveedorRepo: ProveedorRepository,
    private readonly tajadoRepo?: TajadoRepository,
  ) {}

  async execute(inicio: Date, fin: Date, topN: number = 5): Promise<MetricasDashboard> {
    // 1. Financial metrics for the period
    const ingresoTotal = await this.ventaRepo.sumIngresosByPeriod(inicio, fin);
    const costoMercancia = await this.ventaRepo.sumCostosByPeriod(inicio, fin);
    // Calculate using Dinero value objects for precision
    const ingreso = new Dinero(ingresoTotal);
    const costo = new Dinero(costoMercancia);

    const gananciaBruta = ingreso.subtract(costo);

    // 2. Sales-derived metrics from ventas in the period
    const ventas = await this.ventaRepo.findByDateRange(inicio, fin);
    const ventasCount = ventas.length;
    const clientesActivos = new Set(ventas.map((v) => v.clienteId)).size;
    const kgVendidos = ventas.reduce(
      (sum, v) => sum.add(new Dinero(v.cantidadTotalKg.value)),
      Dinero.zero()
    );

    // 3. Margin percentages (as strings, "N/A" if revenue is zero)
    const margenBrutoPct = ingreso.isZero()
      ? 'N/A'
      : String(Math.round(Number(gananciaBruta.divide(ingreso.value).multiply('100').value) * 10) / 10);

    // Volume breakdown — will be computed after items are fetched in section 9
    // Count what was INVOICED (sold), not what was consumed from inventory
    // DC granel is split by variedad (ENTERO/TAJADO) for block normalization
    let dcEnterosVendidos = 0; // whole enteros blocks sold (BLOQUES)
    let dcTajadosVendidos = 0; // whole tajados blocks sold (BLOQUES)
    let dcKgGranelEntero = 0;  // kg sold as granel from ENTERO variety
    let dcKgGranelTajado = 0;  // kg sold as granel from TAJADO variety
    let ssKg = 0;
    let recortesKg = 0;

    // 4. Inventory levels by product type (only ACTIVO lotes)
    const lotesActivos = await this.loteRepo.findActive();
    const inventarioMap = new Map<string, { stock: Dinero; count: number; bloquesEnteros: number; bloquesTajados: number; bloquesTajadosDeFabrica: number; sueltosEntero: Dinero; sueltosTajado: Dinero }>();

    for (const lote of lotesActivos) {
      const producto = lote.producto;
      const existing = inventarioMap.get(producto);
      const stock = new Dinero(lote.stockDisponibleKg.value);
      const bloquesEnteros = lote.bloquesEnteros ?? 0;
      const bloquesTajados = lote.bloquesTajados ?? 0;
      const bloquesTajadosDeFabrica = lote.bloquesTajadosDeFabrica ?? 0;
      const sueltosEntero = new Dinero(lote.sueltosEntero.value);
      const sueltosTajado = new Dinero(lote.sueltosTajado.value);

      if (existing) {
        inventarioMap.set(producto, {
          stock: existing.stock.add(stock),
          count: existing.count + 1,
          bloquesEnteros: existing.bloquesEnteros + bloquesEnteros,
          bloquesTajados: existing.bloquesTajados + bloquesTajados,
          bloquesTajadosDeFabrica: existing.bloquesTajadosDeFabrica + bloquesTajadosDeFabrica,
          sueltosEntero: existing.sueltosEntero.add(sueltosEntero),
          sueltosTajado: existing.sueltosTajado.add(sueltosTajado),
        });
      } else {
        inventarioMap.set(producto, { stock, count: 1, bloquesEnteros, bloquesTajados, bloquesTajadosDeFabrica, sueltosEntero, sueltosTajado });
      }
    }

    const inventario: InventarioPorProducto[] = Array.from(inventarioMap.entries()).map(
      ([producto, data]) => ({
        producto,
        stockDisponibleKg: data.stock.value,
        lotesActivos: data.count,
      })
    );

    // 4b. Inventory by product type (DOBLE_CREMA vs SEMISALADO)
    const inventarioPorTipo: InventarioPorTipo[] = Array.from(inventarioMap.entries()).map(
      ([producto, data]) => {
        return {
          tipo: producto,
          stockKg: data.stock.value,
          lotes: data.count,
          bloquesEnteros: data.bloquesEnteros,
          bloquesTajados: data.bloquesTajados,
          bloquesTajadosDeFabrica: data.bloquesTajadosDeFabrica,
          sueltosEntero: data.sueltosEntero.value,
          sueltosTajado: data.sueltosTajado.value,
        };
      }
    );

    // 5. Inventory value (sum of costoTotalLote proportionally to remaining stock for active lotes)
    let inventarioValor = Dinero.zero();
    for (const lote of lotesActivos) {
      if (lote.cantidadCompradaKg.isZero()) continue; // Skip zero-kg lots (recortes)
      const proporcionRestante = Number(lote.stockDisponibleKg.value) / Number(lote.cantidadCompradaKg.value);
      const valorLote = lote.costoTotalLote.multiply(String(proporcionRestante.toFixed(6)));
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
      tipo: clientes.find((c) => c.id === clienteId)?.tipo ?? 'UNKNOWN',
      ingresoTotal: ingreso,
      dcBloques: 0,
      ssKg: 0,
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

    // 9. Breakdown by product and proveedor
    const allVentaIds = ventas.map((v) => v.id);
    const allItems = allVentaIds.length > 0
      ? await this.ventaItemRepo.findByVentaIds(allVentaIds)
      : [];

    // Build loteId → { producto, proveedorId } map
    const loteIds = [...new Set(allItems.map((item) => item.loteId))];
    const lotes = loteIds.length > 0
      ? await this.loteRepo.findByIds(loteIds)
      : [];
    const loteMap = new Map(lotes.map((l) => [l.id, { producto: l.producto, proveedorId: l.proveedorId }]));

    // Build ventaId → clienteId map for client volume accumulation
    const ventaClienteMap = new Map(ventas.map((v) => [v.id, v.clienteId]));

    // Accumulate volume per top client
    const topClienteMap = new Map(topClientes.map((tc) => [tc.clienteId, tc]));
    for (const item of allItems) {
      const clienteId = ventaClienteMap.get(item.ventaId);
      if (!clienteId) continue;
      const tc = topClienteMap.get(clienteId);
      if (!tc) continue;
      const loteInfo = loteMap.get(item.loteId);
      if (!loteInfo) continue;
      if (loteInfo.producto === 'DOBLE_CREMA') {
        // bloquesTajadosVendidos already includes bloquesTajadosDeFabricaVendidos + bloquesTajadosInternosVendidos
        // bloquesReempacados is a subset of bloquesTajadosInternosVendidos (re-packaged), so do NOT add it again
        const bloques = item.bloquesEnterosVendidos + item.bloquesTajadosVendidos;
        tc.dcBloques += bloques;
      } else if (loteInfo.producto === 'SEMISALADO') {
        tc.ssKg += Number(item.cantidadKg.value);
      }
      // RECORTES_DOBLE_CREMA: not counted in top client DC/SS volume
    }

    // 9a. Volume breakdown — count what was INVOICED, not inventory deductions
    // DC granel is split by origenCorte (ENTERO/TAJADO) for block normalization
    for (const item of allItems) {
      const loteInfo = loteMap.get(item.loteId);
      if (!loteInfo) continue;
      if (loteInfo.producto === 'DOBLE_CREMA') {
        if (item.ventaTipo === 'BLOQUES') {
          // Whole blocks sold — count as enteros/tajados vendidos
          dcEnterosVendidos += item.bloquesEnterosVendidos;
          dcTajadosVendidos += item.bloquesTajadosVendidos;
        } else {
          // GRANEL — split by variedad for block normalization
          const kg = Number(item.cantidadKg.value);
          if (item.origenCorte === 'ENTERO') {
            dcKgGranelEntero += kg;
          } else {
            dcKgGranelTajado += kg;
          }
        }
      } else if (loteInfo.producto === 'SEMISALADO') {
        ssKg += Number(item.cantidadKg.value);
      } else if (loteInfo.producto === 'RECORTES_DOBLE_CREMA') {
        recortesKg += Number(item.cantidadKg.value);
      }
    }

    // Group by product
    const porProductoMap = new Map<string, { ingreso: Dinero; costoAplicado: Dinero; kg: number; count: number; dcEnteros: number; dcTajados: number; dcKgGranelEntero: number; dcKgGranelTajado: number }>();
    for (const item of allItems) {
      const loteInfo = loteMap.get(item.loteId);
      if (!loteInfo) continue;
      const key = loteInfo.producto;
      const existing = porProductoMap.get(key) ?? { ingreso: Dinero.zero(), costoAplicado: Dinero.zero(), kg: 0, count: 0, dcEnteros: 0, dcTajados: 0, dcKgGranelEntero: 0, dcKgGranelTajado: 0 };
      existing.ingreso = existing.ingreso.add(item.ingreso);
      existing.costoAplicado = existing.costoAplicado.add(item.costoAplicado).add(item.costoEmpaques);
      existing.kg += Number(item.cantidadKg.value);
      existing.count += 1;
      if (loteInfo.producto === 'DOBLE_CREMA') {
        if (item.ventaTipo === 'BLOQUES') {
          existing.dcEnteros += item.bloquesEnterosVendidos;
          existing.dcTajados += item.bloquesTajadosVendidos;
        } else {
          const kg = Number(item.cantidadKg.value);
          if (item.origenCorte === 'ENTERO') {
            existing.dcKgGranelEntero += kg;
          } else {
            existing.dcKgGranelTajado += kg;
          }
        }
      }
      porProductoMap.set(key, existing);
    }

    const desglosePorProducto: DesglosePorProducto[] = Array.from(porProductoMap.entries()).map(([producto, data]) => ({
      producto,
      ingreso: data.ingreso.value,
      costoAplicado: data.costoAplicado.value,
      gananciaBruta: data.ingreso.subtract(data.costoAplicado).value,
      kgVendidos: String(data.kg),
      ventasCount: data.count,
      dcEnteros: data.dcEnteros,
      dcTajados: data.dcTajados,
      dcKgGranelEntero: String(data.dcKgGranelEntero),
      dcKgGranelTajado: String(data.dcKgGranelTajado),
    }));

    // Group by proveedor
    const porProveedorMap = new Map<string, { ingreso: Dinero; costoAplicado: Dinero; kg: number; count: number; dcEnteros: number; dcTajados: number; dcKgGranelEntero: number; dcKgGranelTajado: number }>();
    for (const item of allItems) {
      const loteInfo = loteMap.get(item.loteId);
      if (!loteInfo) continue;
      const key = loteInfo.proveedorId;
      const existing = porProveedorMap.get(key) ?? { ingreso: Dinero.zero(), costoAplicado: Dinero.zero(), kg: 0, count: 0, dcEnteros: 0, dcTajados: 0, dcKgGranelEntero: 0, dcKgGranelTajado: 0 };
      existing.ingreso = existing.ingreso.add(item.ingreso);
      existing.costoAplicado = existing.costoAplicado.add(item.costoAplicado).add(item.costoEmpaques);
      existing.kg += Number(item.cantidadKg.value);
      existing.count += 1;
      if (loteInfo.producto === 'DOBLE_CREMA') {
        if (item.ventaTipo === 'BLOQUES') {
          existing.dcEnteros += item.bloquesEnterosVendidos;
          existing.dcTajados += item.bloquesTajadosVendidos;
        } else {
          const kg = Number(item.cantidadKg.value);
          if (item.origenCorte === 'ENTERO') {
            existing.dcKgGranelEntero += kg;
          } else {
            existing.dcKgGranelTajado += kg;
          }
        }
      }
      porProveedorMap.set(key, existing);
    }

    // Resolve proveedor names
    const proveedorIds = Array.from(porProveedorMap.keys());
    const proveedores = proveedorIds.length > 0
      ? await this.proveedorRepo.findByIds(proveedorIds)
      : [];
    const proveedorNombreMap = new Map(proveedores.map((p) => [p.id, p.nombre]));

    const desglosePorProveedor: DesglosePorProveedor[] = Array.from(porProveedorMap.entries()).map(([proveedorId, data]) => ({
      proveedorId,
      proveedorNombre: proveedorNombreMap.get(proveedorId) ?? 'Desconocido',
      ingreso: data.ingreso.value,
      costoAplicado: data.costoAplicado.value,
      gananciaBruta: data.ingreso.subtract(data.costoAplicado).value,
      kgVendidos: String(data.kg),
      ventasCount: data.count,
      dcEnteros: data.dcEnteros,
      dcTajados: data.dcTajados,
      dcKgGranelEntero: String(data.dcKgGranelEntero),
      dcKgGranelTajado: String(data.dcKgGranelTajado),
    }));

    // Sort both by ingreso descending (using Dinero comparison for precision)
    desglosePorProducto.sort((a, b) => new Dinero(b.ingreso).greaterThan(new Dinero(a.ingreso)) ? 1 : new Dinero(a.ingreso).greaterThan(new Dinero(b.ingreso)) ? -1 : 0);
    desglosePorProveedor.sort((a, b) => new Dinero(b.ingreso).greaterThan(new Dinero(a.ingreso)) ? 1 : new Dinero(a.ingreso).greaterThan(new Dinero(b.ingreso)) ? -1 : 0);

    // 9b. Build periodo object (deferred until volume breakdown is computed)
    const periodo: MetricasPeriodo = {
      ingresoTotal: ingreso.value,
      costoMercancia: costo.value,
      gananciaBruta: gananciaBruta.value,
      ventasCount,
      clientesActivos,
      kgVendidos: kgVendidos.value,
      margenBrutoPct,
      volumenDobleCremaEnteros: dcEnterosVendidos,
      volumenDobleCremaTajados: dcTajadosVendidos,
      volumenDobleCremaKgGranelEntero: String(Math.round(dcKgGranelEntero * 10) / 10),
      volumenDobleCremaKgGranelTajado: String(Math.round(dcKgGranelTajado * 10) / 10),
      volumenSemisaladoKg: String(Math.round(ssKg * 10) / 10),
      volumenRecortesKg: String(Math.round(recortesKg * 10) / 10),
    };

    // 10. Flujo de Dinero — revenue grouped by payment method
    // Step 1: Non-CREDITO ventas grouped by metodoPago (ingresoTotal)
    const ingresoByMetodo = await this.ventaRepo.sumIngresoByMetodoPago(inicio, fin);
    let efectivo = Dinero.zero();
    let bancos = Dinero.zero();

    for (const entry of ingresoByMetodo) {
      const amount = new Dinero(entry.total);
      if (entry.metodoPago === 'EFECTIVO') {
        efectivo = efectivo.add(amount);
      } else if (entry.metodoPago === 'NEQUI' || entry.metodoPago === 'BRE_B') {
        bancos = bancos.add(amount);
      }
      // CREDITO entries are excluded — their ingresoTotal is NOT counted in efectivo/bancos
    }

    // Step 2: CREDITO abonos grouped by metodoPagoAbono
    const creditoAbonos = await this.ventaRepo.sumCreditoAbonoByMetodoPagoAbono(inicio, fin);
    for (const entry of creditoAbonos) {
      const amount = new Dinero(entry.total);
      if (entry.metodoPagoAbono === 'EFECTIVO') {
        efectivo = efectivo.add(amount);
      } else if (entry.metodoPagoAbono === 'NEQUI' || entry.metodoPagoAbono === 'BRE_B') {
        bancos = bancos.add(amount);
      }
      // NULL metodoPagoAbono (historical data) — skip, don't count
    }

    // Step 3: AbonoPago records (subsequent payments on credit sales)
    const abonoPagos = await this.ventaRepo.sumAbonoPagoByMetodoPago(inicio, fin);
    for (const entry of abonoPagos) {
      const amount = new Dinero(entry.total);
      if (entry.metodoPago === 'EFECTIVO') {
        efectivo = efectivo.add(amount);
      } else if (entry.metodoPago === 'NEQUI' || entry.metodoPago === 'BRE_B') {
        bancos = bancos.add(amount);
      }
    }

    const cuentasPorCobrarRaw = await this.ventaRepo.sumSaldoPendienteByFecha(inicio, fin);
    const cuentasPorCobrar = new Dinero(cuentasPorCobrarRaw);

    const flujoDinero: FlujoDinero = {
      efectivo: efectivo.value,
      bancos: bancos.value,
      cuentasPorCobrar: cuentasPorCobrar.value,
    };

    // 11. Cuentas por Pagar — cost of unpaid lotes
    const cuentasPorPagarData = await this.loteRepo.sumCostoPendientePago();
    const tajadosPendientesPago = this.tajadoRepo
      ? await this.tajadoRepo.sumPendientePago()
      : '0';
    const cuentasPorPagar: CuentasPorPagar = {
      totalPendiente: cuentasPorPagarData.total,
      cantidadLotes: cuentasPorPagarData.count,
      tajadosPendientesPago,
    };

    return {
      periodo,
      inventario,
      inventarioResumen,
      inventarioPorTipo,
      topClientes,
      ventasDiarias,
      ingresosPorTipoCliente,
      desglosePorProducto,
      desglosePorProveedor,
      flujoDinero,
      cuentasPorPagar,
    };
  }
}