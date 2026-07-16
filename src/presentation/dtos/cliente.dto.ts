// DTO: Cliente request/response types for Presentation → Application boundary
import { TipoCliente } from '@/domain/enums';

export interface CrearClienteRequest {
  nombre: string;
  tipo: TipoCliente;
  precioDobleCremaEntero?: string;
  precioDobleCremaTajado?: string;
  precioSemisalado?: string;
  valorDomicilio?: string;
}

export interface ActualizarClienteRequest {
  id: string;
  nombre?: string;
  precioDobleCremaEntero?: string;
  precioDobleCremaTajado?: string;
  precioSemisalado?: string;
  valorDomicilio?: string;
}

export interface ClienteResponse {
  id: string;
  nombre: string;
  tipo: TipoCliente;
  precioDobleCremaEntero: string | null;
  precioDobleCremaTajado: string | null;
  precioSemisalado: string | null;
  valorDomicilio: string;
  deletedAt: string | null;
}

export interface ClienteListResponse {
  clientes: ClienteResponse[];
}