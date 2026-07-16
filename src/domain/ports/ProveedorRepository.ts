// Port: ProveedorRepository — interface only, no infrastructure imports
import { Proveedor } from '../entities/Proveedor';

export interface ProveedorRepository {
  findById(id: string): Promise<Proveedor | null>;
  findByIds(ids: string[]): Promise<Proveedor[]>;
  findAll(): Promise<Proveedor[]>;
  findActiveByNombre(nombre: string): Promise<Proveedor | null>;
  save(proveedor: Proveedor): Promise<Proveedor>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findDeleted(): Promise<Proveedor[]>;
}