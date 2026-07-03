// Server Action helper: create AuditLog entries for entity mutations
import { prisma } from '@/infrastructure/db';

/**
 * Record an audit log entry for a CREATE, UPDATE, DELETE, or RESTORE action.
 * userId comes from the auth session; null for system actions or if unavailable.
 * Only sets userId if it's a non-empty string to avoid FK constraint violations.
 */
export async function recordAuditLog(params: {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  userId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        // Only set userId if it's a valid non-empty string; otherwise null
        userId: params.userId && params.userId.trim() !== '' ? params.userId : null,
        changes: params.changes ? JSON.stringify(params.changes) : null,
      },
    });
  } catch (error) {
    // Audit logging should never fail the main operation
    console.error('Failed to record audit log:', error);
  }
}