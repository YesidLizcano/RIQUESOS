// Port: UsuarioRepository — interface only, no infrastructure imports
import { Usuario } from '../entities/Usuario';

export interface UsuarioRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  save(usuario: Usuario): Promise<Usuario>;
}