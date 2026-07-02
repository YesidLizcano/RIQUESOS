// DTO: Venta request/response types for Presentation → Application boundary

export interface RegistrarVentaRequest {
  clienteId: string;
  loteId: string;
  cantidadVendidaKg: string;
  standardPricePerKg: string;
  valorDomicilio?: string;
  domiciliario?: string;
}

export interface VentaResponse {
  id: string;
  fecha: string;
  clienteId: string;
  loteId: string;
  cantidadVendidaKg: string;
  precioVentaKg: string;
  ingresoTotal: string;
  costoAplicado: string;
  gananciaBruta: string;
  valorDomicilio: string;
  domiciliario: string;
}

export interface VentaListResponse {
  ventas: VentaResponse[];
}