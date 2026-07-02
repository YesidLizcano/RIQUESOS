// Infrastructure: PrismaAuditLogRepo — implements AuditLogRepository port
import { prisma } from '../db';
import { AuditLog } from '../../domain/entities/AuditLog';
import type { AuditLogRepository } from '../../domain/ports/AuditLogRepository';

export class PrismaAuditLogRepo implements AuditLogRepository {
  async save(entry: AuditLog): Promise<void> {
    await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        userId: entry.userId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    // AuditLog doesn't have deletedAt, no need for includeDeleted
    const records = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<AuditLog[]> {
    const records = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  private toEntity(record: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string | null;
    changes: string | null;
    createdAt: Date;
  }): AuditLog {
    return new AuditLog({
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      userId: record.userId,
      changes: record.changes ? JSON.parse(record.changes) : null,
      createdAt: record.createdAt,
    });
  }
}