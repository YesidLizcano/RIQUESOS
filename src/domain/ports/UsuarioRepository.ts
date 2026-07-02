// Port: UsuarioRepository — interface only, no infrastructure imports
import { Usuario } from '../entities/Usuario';

export interface UsuarioRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  save(usuario: Usuario): Promise<Usuario>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  findDeleted(): Promise<Usuario[]>;
}