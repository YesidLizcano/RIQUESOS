// DTO: Dashboard metrics response types for Presentation → Application boundary

export interface MetricasPeriodoResponse {
  /** Total revenue for the period in AR$ */
  ingresoTotal: string;
  /** Total cost of goods sold for the period in AR$ */
  costoMercancia: string;
  /** Gross profit (revenue - COGS) for the period in AR$ */
  gananciaBruta: string;
  /** Fixed expenses for the period in AR$ */
  gastosFijos: string;
  /** Net profit (gross profit - fixed expenses) for the period in AR$ */
  gananciaNeta: string;
  /** Number of sales in the period */
  ventasCount: number;
  /** Number of distinct clients who purchased in the period */
  clientesActivos: number;
  /** Total kilograms sold in the period */
  kgVendidos: string;
  /** Gross margin percentage (e.g., "32.5" or "N/A" if revenue is zero) */
  margenBrutoPct: string;
  /** Net margin percentage (e.g., "15.2" or "N/A" if revenue is zero) */
  margenNetoPct: string;
}

export interface InventarioPorProductoResponse {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface InventarioResumenResponse {
  /** Total value of active inventory (stockKg × costoRealKg) in AR$ */
  valorTotal: string;
  /** Number of active lotes */
  lotesActivos: number;
}

export interface TopClienteResponse {
  clienteId: string;
  nombre: string;
  ingresoTotal: string;
}

export interface VentasDiariasResponse {
  fecha: string;
  total: string;
}

export interface IngresosPorTipoClienteResponse {
  tipo: string;
  total: string;
}

export interface DashboardMetricasResponse {
  periodo: MetricasPeriodoResponse;
  inventario: InventarioPorProductoResponse[];
  inventarioResumen: InventarioResumenResponse;
  topClientes: TopClienteResponse[];
  ventasDiarias: VentasDiariasResponse[];
  ingresosPorTipoCliente: IngresosPorTipoClienteResponse[];
}