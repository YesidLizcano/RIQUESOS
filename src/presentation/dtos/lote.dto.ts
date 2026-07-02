// DTO: Lote request/response types for Presentation → Application boundary
import { TipoProducto } from '@/domain/enums';

export interface CrearLoteRequest {
  producto: TipoProducto;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
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
  costoFlete: string;
  costoTajado: string;
  costoEmpaques: string;
  costoRealCalculadoKg: string;
  stockDisponibleKg: string;
  estado: string;
  version: number;
}

export interface LoteListResponse {
  lotes: LoteResponse[];
}