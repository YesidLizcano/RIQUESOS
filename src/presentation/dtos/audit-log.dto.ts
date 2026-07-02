// DTO: AuditLog request/response types for Presentation → Application boundary

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
}

export interface AuditLogResponse {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  createdAt: string;
}