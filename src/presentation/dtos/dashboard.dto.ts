// DTO: Dashboard metrics response types for Presentation → Application boundary

export interface MetricasPeriodoResponse {
  /** Total revenue for the period in AR$ */
  ingresoTotal: string;
  /** Total cost of goods sold for the period in AR$ */
  costoMercancia: string;
  /** Gross profit (revenue - COGS) for the period in AR$ */
  gananciaBruta: string;
  /** Number of sales in the period */
  ventasCount: number;
  /** Number of distinct clients who purchased in the period */
  clientesActivos: number;
  /** Total kilograms sold in the period */
  kgVendidos: string;
  /** Gross margin percentage (e.g., "32.5" or "N/A" if revenue is zero) */
  margenBrutoPct: string;
  /** DC enteros sold: whole blocks (BLOQUES) */
  volumenDobleCremaEnteros: number;
  /** DC tajados sold: whole blocks (BLOQUES) */
  volumenDobleCremaTajados: number;
  /** DC kg granel from ENTERO variety (to be converted to blocks + residuo by formatDobleCremaDetalle) */
  volumenDobleCremaKgGranelEntero: string;
  /** DC kg granel from TAJADO variety (to be converted to blocks + residuo by formatDobleCremaDetalle) */
  volumenDobleCremaKgGranelTajado: string;
  /** SS kg sold */
  volumenSemisaladoKg: string;
}

export interface InventarioPorProductoResponse {
  producto: string;
  stockDisponibleKg: string;
  lotesActivos: number;
}

export interface InventarioPorTipoResponse {
  tipo: string;                        // 'DOBLE_CREMA' or 'SEMISALADO'
  stockKg: string;                     // total kg for that product type
  lotes: number;                       // number of active lotes
  bloquesEnteros: number;             // total bloques enteros (DC only, 0 for SS)
  bloquesTajados: number;             // total bloques tajados internos (DC only, 0 for SS)
  bloquesTajadosDeFabrica: number;    // total bloques tajados de fábrica (DC only, 0 for SS)
  sueltosEntero: string;               // loose enteros kg (DC only)
  sueltosTajado: string;               // loose tajados kg (DC only; equals stockKg for SS)
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
  tipo: string;
  ingresoTotal: string;
  dcBloques: number;
  ssKg: number;
}

export interface VentasDiariasResponse {
  fecha: string;
  total: string;
}

export interface IngresosPorTipoClienteResponse {
  tipo: string;
  total: string;
}

export interface DesglosePorProductoResponse {
  producto: string;
  ingreso: string;
  costoAplicado: string;
  gananciaBruta: string;
  kgVendidos: string;
  ventasCount: number;
  /** DC block volume: whole enteros sold */
  dcEnteros: number;
  /** DC block volume: whole tajados sold */
  dcTajados: number;
  /** DC granel volume: kg sold as ENTERO variety */
  dcKgGranelEntero: string;
  /** DC granel volume: kg sold as TAJADO variety */
  dcKgGranelTajado: string;
}

export interface DesglosePorProveedorResponse {
  proveedorId: string;
  proveedorNombre: string;
  ingreso: string;
  costoAplicado: string;
  gananciaBruta: string;
  kgVendidos: string;
  ventasCount: number;
  /** DC block volume: whole enteros sold */
  dcEnteros: number;
  /** DC block volume: whole tajados sold */
  dcTajados: number;
  /** DC granel volume: kg sold as ENTERO variety */
  dcKgGranelEntero: string;
  /** DC granel volume: kg sold as TAJADO variety */
  dcKgGranelTajado: string;
}

export interface FlujoDineroResponse {
  efectivo: string;
  bancos: string;
  cuentasPorCobrar: string;
}

export interface CuentasPorPagarResponse {
  totalPendiente: string;
  cantidadLotes: number;
  tajadosPendientesPago: string;
}

export interface CuentaPorPagarLoteResponse {
  loteId: string;
  producto: string;
  fechaIngreso: string;
  cantidadCompradaKg: string;
  costoRealCalculadoKg: string;
  costoTotal: string;
  estadoPago: string;
}

export interface CuentasPorPagarDetalleResponse {
  proveedorId: string;
  proveedorNombre: string;
  lotes: CuentaPorPagarLoteResponse[];
  totalPendiente: string;
}

export interface CuentasPorPagarDetalleListResponse {
  grupos: CuentasPorPagarDetalleResponse[];
  totalGeneral: string;
}

export interface DashboardMetricasResponse {
  periodo: MetricasPeriodoResponse;
  inventario: InventarioPorProductoResponse[];
  inventarioResumen: InventarioResumenResponse;
  inventarioPorTipo: InventarioPorTipoResponse[];
  topClientes: TopClienteResponse[];
  ventasDiarias: VentasDiariasResponse[];
  ingresosPorTipoCliente: IngresosPorTipoClienteResponse[];
  desglosePorProducto: DesglosePorProductoResponse[];
  desglosePorProveedor: DesglosePorProveedorResponse[];
  flujoDinero: FlujoDineroResponse;
  cuentasPorPagar: CuentasPorPagarResponse;
}