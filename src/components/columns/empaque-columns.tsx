'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw, Package } from 'lucide-react';
import type { EmpaqueResponse } from '@/presentation/dtos';
import { EditarEmpaqueDialog } from '@/components/forms/editar-empaque-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarEmpaque, restaurarEmpaque } from '@/presentation/actions/empaques';
import { toast } from 'sonner';

export function EmpaqueActions({ empaque, showDeleted }: { empaque: EmpaqueResponse; showDeleted: boolean }) {
  const refreshData = useRefresh();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = empaque.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', empaque.id);
    const result = await eliminarEmpaque(formData);
    if (result.success) {
      toast.success('Empaque eliminado exitosamente');
      refreshData();
    } else {
      toast.error(result.error || 'Error al eliminar empaque');
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', empaque.id);
    const result = await restaurarEmpaque(formData);
    if (result.success) {
      toast.success('Empaque restaurado exitosamente');
      refreshData();
    } else {
      toast.error(result.error || 'Error al restaurar empaque');
    }
  }

  if (isDeleted) {
    return (
      <button
        onClick={() => { handleRestore(); }}
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
      <EditarEmpaqueDialog empaque={empaque} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={`el empaque "${empaque.tipo}"`}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function createEmpaqueColumns(showDeleted?: boolean): ColumnDef<EmpaqueResponse, unknown>[] {
  return [
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const empaque = row.original;
        const isDeleted = empaque.deletedAt !== null;
        return (
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className={isDeleted ? 'line-through opacity-50' : ''}>
              {empaque.tipo}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number;
        return (
          <span className={stock <= 0 ? 'text-destructive font-medium' : ''}>
            {stock}
          </span>
        );
      },
    },
    {
      accessorKey: 'precio',
      header: 'Precio ($)',
      cell: ({ row }) => `$${Number(row.getValue('precio')).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => <EmpaqueActions empaque={row.original} showDeleted={showDeleted ?? false} />,
    },
  ];
}