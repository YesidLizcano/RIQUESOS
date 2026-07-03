// DTO: Lote request/response types for Presentation → Application boundary
import { TipoProducto } from '@/domain/enums';

export interface CrearLoteRequest {
  producto: TipoProducto;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloque?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  bloquesEnteros?: number;
  bloquesTajadosDeFabrica?: number;
}

export interface ActualizarLoteRequest {
  id: string;
  version: number;
  precioCompraBaseKg?: string;
  precioPorBloque?: string;
  cantidadCompradaKg?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
}

export interface LoteResponse {
  id: string;
  producto: TipoProducto;
  fechaIngreso: string;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloque: string;
  costoFlete: string;
  costoTajado: string;
  costoEmpaques: string;
  costoRealCalculadoKg: string;
  stockDisponibleKg: string;
  bloquesEnteros: number;
  bloquesTajados: number;
  bloquesTajadosDeFabrica: number;
  estado: string;
  version: number;
  deletedAt: string | null;
}

export interface LoteListResponse {
  lotes: LoteResponse[];
}