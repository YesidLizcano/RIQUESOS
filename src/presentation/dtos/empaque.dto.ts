// DTO: Empaque request/response types for Presentation → Application boundary

import { CategoriaInsumo } from '@/domain/enums';

export interface CrearEmpaqueRequest {
  categoria: CategoriaInsumo;
  stock: string;
  precio: string;
}

export interface ActualizarEmpaqueRequest {
  id: string;
  tipo?: string;
  categoria?: CategoriaInsumo;
  stock?: string;
  precio?: string;
}

export interface EmpaqueResponse {
  id: string;
  tipo: string;
  categoria: CategoriaInsumo;
  stock: string;
  precio: string;
  deletedAt: string | null;
  comprasCount?: number;
  lastCompraDate?: string | null;
}

export interface EmpaqueListResponse {
  empaques: EmpaqueResponse[];
}