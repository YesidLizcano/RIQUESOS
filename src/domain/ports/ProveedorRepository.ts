// Port: ProveedorRepository — interface only, no infrastructure imports
import { Proveedor } from '../entities/Proveedor';

export interface ProveedorRepository {
  findById(id: string): Promise<Proveedor | null>;
  findAll(): Promise<Proveedor[]>;
  save(proveedor: Proveedor): Promise<Proveedor>;
  delete(id: string): Promise<void>;
}