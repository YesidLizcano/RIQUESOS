// DTO: Venta request/response types for Presentation → Application boundary

import type { AbonoPagoResponse } from './abono-pago.dto';

export type VentaTipo = 'BLOQUES' | 'GRANEL';

export interface VentaItemRequest {
  loteId: string;
  ventaTipo: VentaTipo;
  cantidadKg: string;
  precioVentaKg: string;
  bloquesEnterosVendidos?: number;
  bloquesTajadosVendidos?: number;
  bloquesTajadosDeFabricaVendidos?: number;
  bloquesTajadosInternosVendidos?: number;
  bloquesReempacados?: number;
  precioEnteroBloque?: string;
  precioTajadoBloque?: string;
  origenCorte?: string;
  origenTajadoGranel?: string | null;  // 'INTERNO' or 'FABRICA'
  sueltosEnteroDelta?: string;
  sueltosTajadoDelta?: string;
}

export interface RegistrarVentaRequest {
  clienteId: string;
  items: VentaItemRequest[];
  valorDomicilio?: string;
  costoDomiciliario?: string;
  domiciliario?: string;
  metodoPago?: string;
  metodoPagoAbono?: string;
  abono?: string;
  observaciones?: string;
}

export interface VentaItemResponse {
  id: string;
  ventaId: string;
  loteId: string;
  ventaTipo: VentaTipo;
  cantidadKg: string;
  precioVentaKg: string;
  ingreso: string;
  costoAplicadoKg: string;
  costoAplicado: string;
  bloquesEnterosVendidos: number;
  bloquesTajadosVendidos: number;
  bloquesTajadosDeFabricaVendidos: number;
  bloquesTajadosInternosVendidos: number;
  bloquesReempacados: number;
  costoEmpaques: string;
  precioEnteroBloque?: string | null;
  precioTajadoBloque?: string | null;
  origenCorte?: string;
  origenTajadoGranel?: string | null;  // 'INTERNO' or 'FABRICA'
  sueltosEnteroDelta?: string;
  sueltosTajadoDelta?: string;
  loteProducto?: string;
  loteProveedorNombre?: string;
}

export interface AbonoMetodoPagoBreakdown {
  metodoPago: string;   // 'EFECTIVO' | 'NEQUI' | 'BRE_B'
  monto: string;        // total amount paid via this method
  porcentaje: number;   // (monto / ingresoTotal) * 100, rounded to 1 decimal
}

export interface VentaResponse {
  id: string;
  fecha: string;
  clienteId: string;
  clienteNombre?: string;
  sedeId?: string | null;
  sedeNombre?: string | null;
  cantidadTotalKg: string;
  ingresoTotal: string;
  costoAplicado: string;
  gananciaBruta: string;
  valorDomicilio: string;
  costoDomiciliario: string;
  domiciliario: string;
  metodoPago: string;
  metodoPagoAbono: string | null;
  abono: string;
  saldo: string;
  observaciones: string | null;
  items: VentaItemResponse[];
  abonos?: AbonoPagoResponse[];
  abonoMetodoPagoBreakdown?: AbonoMetodoPagoBreakdown[];  // Only for CREDITO ventas
}

export interface VentaListResponse {
  ventas: VentaResponse[];
}