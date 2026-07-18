// DTO: Lote request/response types for Presentation → Application boundary
import { TipoProducto, EstadoPagoLote, MetodoPago } from '@/domain/enums';

export interface CrearLoteRequest {
  producto: TipoProducto;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloqueEntero?: string;
  precioPorBloqueTajado?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  bloquesEnteros?: number;
  bloquesTajadosDeFabrica?: number;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
}

export interface ActualizarLoteRequest {
  id: string;
  version: number;
  precioCompraBaseKg?: string;
  precioPorBloqueEntero?: string;
  precioPorBloqueTajado?: string;
  cantidadCompradaKg?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
}

export interface LoteResponse {
  id: string;
  producto: TipoProducto;
  fechaIngreso: string;
  proveedorId: string;
  proveedorNombre?: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloqueEntero: string;
  precioPorBloqueTajado: string;
  costoFlete: string;
  costoTajado: string;
  costoEmpaques: string;
  costoSeparadores: string;
  costoRealCalculadoKg: string;
  costoTajadoKg: string;
  costoTajadoFabricaKg: string;
  costoTotalLote: string;
  stockDisponibleKg: string;
  bloquesEnteros: number;
  bloquesTajados: number;
  bloquesTajadosDeFabrica: number;
  bloquesEnterosOriginal: number;
  bloquesTajadosFabricaOriginal: number;
  sueltosEntero: string;
  sueltosTajado: string;
  /** Computed: total tajados available for sale (internal + de fábrica) */
  bloquesTajadosDisponibles: number;
  estado: string;
  estadoPago: string;
  metodoPagoLote: string;
  version: number;
  deletedAt: string | null;
  /** Detailed cost breakdown for auditing DC block cost calculations */
  costBreakdown?: Record<string, string>;
}

export interface LoteListResponse {
  lotes: LoteResponse[];
}

export interface LotesByProveedorResponse {
  lotes: LoteResponse[];
  proveedorNombre: string;
  totalLotes: number;
  totalCosto: string;
  lotesPagados: number;
  lotesPendientes: number;
  montoPendienteTotal: string;
}