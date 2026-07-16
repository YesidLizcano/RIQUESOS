import type { PrecioClienteProveedor } from '../entities/PrecioClienteProveedor';

export interface PrecioClienteProveedorRepository {
  findByClienteAndProveedor(clienteId: string, proveedorId: string): Promise<PrecioClienteProveedor | null>;
  findByCliente(clienteId: string): Promise<PrecioClienteProveedor[]>;
  save(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor>;
  update(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor>;
  upsert(precio: PrecioClienteProveedor): Promise<PrecioClienteProveedor>;
}