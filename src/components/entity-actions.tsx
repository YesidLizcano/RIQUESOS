'use client';

import { useState } from 'react';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import { useRefresh } from '@/components/refresh-context';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { toast } from 'sonner';

interface EntityActionsProps {
  entityId: string;
  entityName: string;
  isDeleted: boolean;
  editLabel?: string;
  editAriaLabel?: string;
  deleteAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  restoreAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteToastLabel: string;
  restoreToastLabel?: string;
  renderEditDialog: (open: boolean, onOpenChange: (open: boolean) => void) => React.ReactNode;
}

export function EntityActions({
  entityId,
  entityName,
  isDeleted,
  editLabel = 'Editar',
  editAriaLabel,
  deleteAction,
  restoreAction,
  deleteToastLabel,
  restoreToastLabel,
  renderEditDialog,
}: EntityActionsProps) {
  const refreshData = useRefresh();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const effectiveRestoreLabel = restoreToastLabel ?? deleteToastLabel;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', entityId);
    const result = await deleteAction(formData);
    if (result.success) {
      toast.success(`${deleteToastLabel} eliminado exitosamente`);
      refreshData();
    } else {
      toast.error(result.error || `Error al eliminar ${deleteToastLabel.toLowerCase()}`);
      throw new Error(result.error || `Error al eliminar ${deleteToastLabel.toLowerCase()}`);
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', entityId);
    const result = await restoreAction(formData);
    if (result.success) {
      toast.success(`${effectiveRestoreLabel} restaurado exitosamente`);
      refreshData();
    } else {
      toast.error(result.error || `Error al restaurar ${effectiveRestoreLabel.toLowerCase()}`);
      throw new Error(result.error || `Error al restaurar ${effectiveRestoreLabel.toLowerCase()}`);
    }
  }

  if (isDeleted) {
    return (
      <button
        onClick={() => { handleRestore(); }}
        className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50"
        title="Restaurar"
        aria-label="Restaurar"
      >
        <RotateCcw className="size-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
        title={editLabel}
        aria-label={editAriaLabel ?? editLabel}
      >
        <Pencil className="size-4" />
      </button>
      <button
        onClick={() => setDeleteOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Eliminar"
        aria-label="Eliminar"
      >
        <Trash2 className="size-4" />
      </button>
      {renderEditDialog(editOpen, setEditOpen)}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={entityName}
        onConfirm={handleDelete}
      />
    </>
  );
}