// DTO: GastoFijo request/response types for Presentation → Application boundary

export interface CrearGastoRequest {
  concepto: string;
  valor: string;
}

export interface ActualizarGastoRequest {
  id: string;
  concepto?: string;
  valor?: string;
}

export interface GastoResponse {
  id: string;
  fecha: string;
  concepto: string;
  valor: string;
}

export interface GastoListResponse {
  gastos: GastoResponse[];
}

export interface GastoMensualResumenResponse {
  total: string;
  gastos: GastoResponse[];
}