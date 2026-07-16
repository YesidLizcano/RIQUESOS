// Presentation DTOs — barrel export
export type { CrearLoteRequest, ActualizarLoteRequest, LoteResponse, LoteListResponse, LotesByProveedorResponse } from './lote.dto';
export type { CrearTajadoRequest, TajadoResponse } from './tajado.dto';
export type { RegistrarVentaRequest, VentaResponse, VentaListResponse, VentaTipo, VentaItemRequest, VentaItemResponse, AbonoMetodoPagoBreakdown } from './venta.dto';
export type { CrearClienteRequest, ActualizarClienteRequest, ClienteResponse, ClienteListResponse } from './cliente.dto';
export type { CrearProveedorRequest, ActualizarProveedorRequest, ProveedorResponse, ProveedorListResponse } from './proveedor.dto';
export type { MetricasPeriodoResponse, InventarioPorProductoResponse, InventarioResumenResponse, TopClienteResponse, VentasDiariasResponse, IngresosPorTipoClienteResponse, DesglosePorProductoResponse, DesglosePorProveedorResponse, DashboardMetricasResponse, FlujoDineroResponse, CuentasPorPagarResponse, CuentaPorPagarLoteResponse, CuentasPorPagarDetalleResponse, CuentasPorPagarDetalleListResponse } from './dashboard.dto';
export type { LoginRequest, AuthResponse } from './auth.dto';
export type { CrearEmpaqueRequest, ActualizarEmpaqueRequest, EmpaqueResponse, EmpaqueListResponse } from './empaque.dto';
export type { RegistrarCompraRequest, CompraInsumoResponse, CompraInsumoListResponse } from './compra-insumo.dto';
export type { CrearSedeRequest, ActualizarSedeRequest, SedeResponse, SedeListResponse } from './sede.dto';