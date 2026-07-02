// DTO: Cliente request/response types for Presentation → Application boundary
import { TipoCliente } from '@/domain/enums';

export interface CrearClienteRequest {
  nombre: string;
  tipo: TipoCliente;
  precioDobleCrema?: string;
  precioSemisalado?: string;
}

export interface ActualizarClienteRequest {
  id: string;
  nombre?: string;
  precioDobleCrema?: string;
  precioSemisalado?: string;
}

export interface ClienteResponse {
  id: string;
  nombre: string;
  tipo: TipoCliente;
  precioDobleCrema: string | null;
  precioSemisalado: string | null;
  deletedAt: string | null;
}

export interface ClienteListResponse {
  clientes: ClienteResponse[];
}