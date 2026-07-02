// Infrastructure: PrismaUsuarioRepo — implements UsuarioRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Usuario } from '../../domain/entities/Usuario';
import { RolUsuario } from '../../domain/enums';
import type { UsuarioRepository } from '../../domain/ports/UsuarioRepository';

export class PrismaUsuarioRepo implements UsuarioRepository {
  async findByEmail(email: string): Promise<Usuario | null> {
    const record = await prisma.usuario.findUnique({ where: { email } });
    if (!record) return null;
    return this.toEntity(record);
  }

  async save(usuario: Usuario): Promise<Usuario> {
    const data = {
      email: usuario.email,
      passwordHash: usuario.passwordHash,
      role: usuario.role as RolUsuario,
    };

    if (usuario.id) {
      const updated = await prisma.usuario.update({
        where: { id: usuario.id },
        data,
      });
      return this.toEntity(updated);
    }

    const created = await prisma.usuario.create({ data });
    return this.toEntity(created);
  }

  private toEntity(record: Prisma.UsuarioGetPayload<{}>): Usuario {
    return new Usuario({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      role: record.role as string as RolUsuario,
    });
  }
}