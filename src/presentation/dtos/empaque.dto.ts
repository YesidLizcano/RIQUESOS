// DTO: Empaque request/response types for Presentation → Application boundary

export interface CrearEmpaqueRequest {
  tipo: string;
  stock: number;
  precio: string;
}

export interface ActualizarEmpaqueRequest {
  id: string;
  tipo?: string;
  stock?: number;
  precio?: string;
}

export interface EmpaqueResponse {
  id: string;
  tipo: string;
  stock: number;
  precio: string;
  deletedAt: string | null;
}

export interface EmpaqueListResponse {
  empaques: EmpaqueResponse[];
}