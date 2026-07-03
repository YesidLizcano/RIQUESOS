// DTO: Tajado request/response types for Presentation → Application boundary

export interface CrearTajadoRequest {
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
}

export interface TajadoResponse {
  id: string;
  loteId: string;
  cantidadBloques: number;
  precioPorBloque: string;
  tajador: string;
  costoTotal: string;
  fecha: string;
}