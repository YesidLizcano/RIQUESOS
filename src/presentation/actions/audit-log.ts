// Server Action helper: create AuditLog entries for entity mutations
import { prisma } from '@/infrastructure/db';

/**
 * Record an audit log entry for a CREATE, UPDATE, DELETE, or RESTORE action.
 * userId comes from the auth session; null for system actions.
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
        userId: params.userId ?? null,
        changes: params.changes ? JSON.stringify(params.changes) : null,
      },
    });
  } catch (error) {
    // Audit logging should never fail the main operation
    console.error('Failed to record audit log:', error);
  }
}