// Use Case: AutenticarUsuario — verify credentials, return session user
// Application layer: can import from Domain but NOT from Infrastructure
import type { UsuarioRepository } from '../../domain/ports/UsuarioRepository';
import { Usuario } from '../../domain/entities/Usuario';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
}

export class AutenticarUsuario {
  constructor(
    private readonly usuarioRepo: UsuarioRepository,
    private readonly verifyPassword: (plain: string, hash: string) => Promise<boolean>
  ) {}

  async execute(email: string, password: string): Promise<AuthResult> {
    // Validate input
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    // Find user by email
    const usuario = await this.usuarioRepo.findByEmail(email);
    if (!usuario) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isValid = await this.verifyPassword(password, usuario.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Return session user data (never expose passwordHash)
    return {
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
      },
    };
  }
}