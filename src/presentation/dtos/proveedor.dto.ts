// DTO: Proveedor request/response types for Presentation → Application boundary

export interface CrearProveedorRequest {
  nombre: string;
  telefono?: string;
}

export interface ActualizarProveedorRequest {
  id: string;
  nombre?: string;
  telefono?: string;
}

export interface ProveedorResponse {
  id: string;
  nombre: string;
  telefono: string | null;
}

export interface ProveedorListResponse {
  proveedores: ProveedorResponse[];
}