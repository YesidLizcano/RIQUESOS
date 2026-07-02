// Port: AuditLogRepository — interface only, no infrastructure imports
import { AuditLog } from '../entities/AuditLog';

export interface AuditLogRepository {
  save(entry: AuditLog): Promise<void>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findAll(): Promise<AuditLog[]>;
}