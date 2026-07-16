// DTO: Sede request/response types for Presentation → Application boundary

export interface CrearSedeRequest {
  nombre: string;
  direccion?: string;
  telefono?: string;
  esPrincipal?: boolean;
  clienteId: string;
}

export interface ActualizarSedeRequest {
  id: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  esPrincipal?: boolean;
}

export interface SedeResponse {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  esPrincipal: boolean;
  clienteId: string;
  deletedAt: string | null;
}

export interface SedeListResponse {
  sedes: SedeResponse[];
}