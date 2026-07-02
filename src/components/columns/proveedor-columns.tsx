'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { ProveedorResponse } from '@/presentation/dtos';
import { EditarProveedorDialog } from '@/components/forms/editar-proveedor-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarProveedor, restaurarProveedor } from '@/presentation/actions/proveedores';
import { toast } from 'sonner';
import { startTransition } from 'react';

export function ProveedorActions({ proveedor }: { proveedor: ProveedorResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = proveedor.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', proveedor.id);
    const result = await eliminarProveedor(formData);
    if (result.success) {
      toast.success('Proveedor eliminado exitosamente');
    } else {
      toast.error(result.error || 'Error al eliminar proveedor');
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', proveedor.id);
    const result = await restaurarProveedor(formData);
    if (result.success) {
      toast.success('Proveedor restaurado exitosamente');
    } else {
      toast.error(result.error || 'Error al restaurar proveedor');
    }
  }

  if (isDeleted) {
    return (
      <button
        onClick={() => startTransition(() => { handleRestore(); })}
        className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50"
        title="Restaurar"
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
        title="Editar"
      >
        <Pencil className="size-4" />
      </button>
      <button
        onClick={() => setDeleteOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Eliminar"
      >
        <Trash2 className="size-4" />
      </button>
      <EditarProveedorDialog proveedor={proveedor} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={`el proveedor "${proveedor.nombre}"`}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function createProveedorColumns(
  showDeleted?: boolean
): ColumnDef<ProveedorResponse, unknown>[] {
  return [
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      cell: ({ row }) => {
        const isDeleted = row.original.deletedAt !== null;
        return (
          <span className={isDeleted ? 'line-through opacity-50' : ''}>
            {row.getValue('nombre') as string}
          </span>
        );
      },
    },
    {
      accessorKey: 'telefono',
      header: 'Teléfono',
      cell: ({ row }) => {
        const telefono = row.getValue('telefono') as string | null;
        return telefono || '—';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => <ProveedorActions proveedor={row.original} />,
    },
  ];
}

// Keep backward-compatible export for pages that don't need deleted toggle
export const proveedorColumns = createProveedorColumns();