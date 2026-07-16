export interface AbonoPagoResponse {
  id: string;
  ventaId: string;
  monto: string;
  metodoPago: string;
  observacion: string | null;
  fecha: string;
}

export interface RegistrarAbonoPagoResult {
  success: boolean;
  abono?: AbonoPagoResponse;
  saldoRestante?: string;
  error?: string;
}