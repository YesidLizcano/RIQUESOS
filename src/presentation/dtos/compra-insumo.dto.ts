// DTO: CompraInsumo request/response types for Presentation → Application boundary

import { CategoriaInsumo } from '@/domain/enums';

export interface RegistrarCompraRequest {
  empaqueId: string;
  cantidad: string;
  precioUnitario: string;
}

export interface CompraInsumoResponse {
  id: string;
  empaqueId: string;
  categoria: CategoriaInsumo;
  cantidad: string;
  cantidadRestante: string;
  precioUnitario: string;
  costoTotal: string;
  fecha: string;
  empaqueTipo?: string;
}

export interface CompraInsumoListResponse {
  compras: CompraInsumoResponse[];
}