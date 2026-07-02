// Entity: AuditLog — centralized audit trail for all entity mutations
// No external imports from infrastructure or frameworks

export interface AuditLogProps {
  id?: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  createdAt?: Date;
}

export class AuditLog {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly userId: string | null;
  readonly changes: Record<string, { old: unknown; new: unknown }> | null;
  readonly createdAt: Date;

  constructor(props: AuditLogProps) {
    this.id = props.id ?? '';
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.action = props.action;
    this.userId = props.userId ?? null;
    this.changes = props.changes ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }
}