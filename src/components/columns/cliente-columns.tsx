'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { ClienteResponse } from '@/presentation/dtos';
import { EditarClienteDialog } from '@/components/forms/editar-cliente-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarCliente, restaurarCliente } from '@/presentation/actions/clientes';
import { toast } from 'sonner';
import { TipoCliente } from '@/domain/enums';
import { tipoClienteLabel } from '@/domain/labels';

export function ClienteActions({ cliente }: { cliente: ClienteResponse }) {
  const refreshData = useRefresh();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = cliente.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', cliente.id);
    const result = await eliminarCliente(formData);
    if (result.success) {
      toast.success('Cliente eliminado exitosamente');
      refreshData();
    } else {
      toast.error(result.error || 'Error al eliminar cliente');
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', cliente.id);
    const result = await restaurarCliente(formData);
    if (result.success) {
      toast.success('Cliente restaurado exitosamente');
      refreshData();
    } else {
      toast.error(result.error || 'Error al restaurar cliente');
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
      <EditarClienteDialog cliente={cliente} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={`el cliente "${cliente.nombre}"`}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function createClienteColumns(
  showDeleted?: boolean
): ColumnDef<ClienteResponse, unknown>[] {
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
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const tipo = row.getValue('tipo') as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tipo === 'MAYORISTA' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
            {tipoClienteLabel[tipo as TipoCliente] ?? tipo}
          </span>
        );
      },
    },
    {
      accessorKey: 'precioDobleCrema',
      header: 'Precio Doble Crema',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const value = row.getValue('precioDobleCrema') as string | null;
        return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
      },
    },
    {
      accessorKey: 'precioSemisalado',
      header: 'Precio Semisalado',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const value = row.getValue('precioSemisalado') as string | null;
        return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => <ClienteActions cliente={row.original} />,
    },
  ];
}

// Keep backward-compatible export for pages that don't need deleted toggle
export const clienteColumns = createClienteColumns();