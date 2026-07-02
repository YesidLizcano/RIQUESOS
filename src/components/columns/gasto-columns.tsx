'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { GastoResponse } from '@/presentation/dtos';
import { EditarGastoFijoDialog } from '@/components/forms/editar-gasto-fijo-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarGasto } from '@/presentation/actions/gastos';
import { toast } from 'sonner';

export function GastoActions({ gasto }: { gasto: GastoResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

export const gastoColumns: ColumnDef<GastoResponse, unknown>[] = [
  {
    accessorKey: 'concepto',
    header: 'Concepto',
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