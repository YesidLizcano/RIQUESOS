// DTO: Dashboard metrics response types for Presentation → Application boundary

export interface MetricasPeriodoResponse {
  ingresoTotal: string;
  costoMercancia: string;
  gananciaBruta: string;
  gastosFijos: string;
  gananciaNeta: string;
}

export interface InventarioPorProductoResponse {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface TopClienteResponse {
  clienteId: string;
  nombre: string;
  ingresoTotal: string;
}

export interface DashboardMetricasResponse {
  periodo: MetricasPeriodoResponse;
  inventario: InventarioPorProductoResponse[];
  topClientes: TopClienteResponse[];
}