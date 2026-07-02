'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { GastoResponse } from '@/presentation/dtos';
import { EditarGastoFijoDialog } from '@/components/forms/editar-gasto-fijo-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarGasto, restaurarGasto } from '@/presentation/actions/gastos';
import { toast } from 'sonner';
import { startTransition } from 'react';

export function GastoActions({ gasto }: { gasto: GastoResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = gasto.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', gasto.id);
    const result = await eliminarGasto(formData);
    if (result.success) {
      toast.success('Gasto eliminado exitosamente');
    } else {
      toast.error(result.error || 'Error al eliminar gasto');
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', gasto.id);
    const result = await restaurarGasto(formData);
    if (result.success) {
      toast.success('Gasto restaurado exitosamente');
    } else {
      toast.error(result.error || 'Error al restaurar gasto');
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
      <EditarGastoFijoDialog gasto={gasto} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={`el gasto "${gasto.concepto}"`}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function createGastoColumns(
  showDeleted?: boolean
): ColumnDef<GastoResponse, unknown>[] {
  return [
    {
      accessorKey: 'concepto',
      header: 'Concepto',
      cell: ({ row }) => {
        const isDeleted = row.original.deletedAt !== null;
        return (
          <span className={isDeleted ? 'line-through opacity-50' : ''}>
            {row.getValue('concepto') as string}
          </span>
        );
      },
    },
    {
      accessorKey: 'valor',
      header: 'Valor',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('valor')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      enableGlobalFilter: false,
      cell: ({ row }) => new Date(row.getValue('fecha') as string).toLocaleDateString('es-AR'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => <GastoActions gasto={row.original} />,
    },
  ];
}

// Keep backward-compatible export
export const gastoColumns = createGastoColumns();