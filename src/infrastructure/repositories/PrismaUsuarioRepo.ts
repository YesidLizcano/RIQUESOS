// Infrastructure: PrismaUsuarioRepo — implements UsuarioRepository port
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { Usuario } from '../../domain/entities/Usuario';
import { RolUsuario } from '../../domain/enums';
import { asRolUsuario } from '../../domain/mappers';
import type { UsuarioRepository } from '../../domain/ports/UsuarioRepository';

export class PrismaUsuarioRepo implements UsuarioRepository {
  async findByEmail(email: string): Promise<Usuario | null> {
    // Must check deletedAt to exclude soft-deleted users from login
    const record = await prisma.usuario.findUnique({
      where: { email },
    });
    if (!record) return null;
    // If user is soft-deleted, treat as not found for login purposes
    if (record.deletedAt !== null) return null;
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

  async softDelete(id: string): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findDeleted(): Promise<Usuario[]> {
    const records = await prisma.usuario.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: Prisma.UsuarioGetPayload<{}>): Usuario {
    return new Usuario({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      role: asRolUsuario(record.role),
      deletedAt: record.deletedAt,
    });
  }
}