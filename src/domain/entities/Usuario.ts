// Entity: Usuario — email, passwordHash, role
// No external imports from infrastructure or frameworks

import { RolUsuario } from '../enums';

export interface UsuarioProps {
  id?: string;
  email: string;
  passwordHash: string;
  role?: RolUsuario;
  deletedAt?: Date | null;
}

export class Usuario {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: RolUsuario;
  readonly deletedAt: Date | null;

  constructor(props: UsuarioProps) {
    this.id = props.id ?? '';
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role ?? RolUsuario.ADMIN;
    this.deletedAt = props.deletedAt ?? null;

    this.validate();
  }

  private validate(): void {
    if (!this.email || this.email.trim().length === 0) {
      throw new Error('Usuario email is required');
    }
    // Basic email format validation
    if (!this.email.includes('@')) {
      throw new Error('Usuario email must be a valid email address');
    }
    if (!this.passwordHash || this.passwordHash.trim().length === 0) {
      throw new Error('Usuario passwordHash is required');
    }
  }

  updateRole(role: RolUsuario): Usuario {
    return new Usuario({
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      role,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Usuario {
    return new Usuario({
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      deletedAt: new Date(),
    });
  }

  restore(): Usuario {
    return new Usuario({
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      deletedAt: null,
    });
  }
}