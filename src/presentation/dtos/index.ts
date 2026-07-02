// Presentation DTOs — barrel export
export type { CrearLoteRequest, ActualizarLoteRequest, LoteResponse, LoteListResponse } from './lote.dto';
export type { RegistrarVentaRequest, VentaResponse, VentaListResponse } from './venta.dto';
export type { CrearClienteRequest, ActualizarClienteRequest, ClienteResponse, ClienteListResponse } from './cliente.dto';
export type { CrearGastoRequest, ActualizarGastoRequest, GastoResponse, GastoListResponse, GastoMensualResumenResponse } from './gasto.dto';
export type { CrearProveedorRequest, ActualizarProveedorRequest, ProveedorResponse, ProveedorListResponse } from './proveedor.dto';
export type { MetricasPeriodoResponse, InventarioPorProductoResponse, TopClienteResponse, DashboardMetricasResponse } from './dashboard.dto';
export type { LoginRequest, AuthResponse } from './auth.dto';