// DTO: Tajado request/response types for Presentation → Application boundary

export interface CrearTajadoRequest {
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  recortesKg?: string;
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
  recortesKg: string;
  estadoPago: string;
  fecha: string;
}