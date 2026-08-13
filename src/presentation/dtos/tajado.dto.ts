// DTO: Tajado request/response types for Presentation → Application boundary

export interface CrearTajadoRequest {
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  recortesKg?: string;
  reempacados?: number;
}

export interface TajadoResponse {
  id: string;
  loteId: string;
  loteInfo?: { producto: string; proveedor: string };
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  costoTotal: string;
  separadoresKg: string;
  costoSeparadores: string;
  costoEmpaques: string;
  recortesKg: string;
  reempacados: number;
  estadoPago: string;
  fecha: string;
}