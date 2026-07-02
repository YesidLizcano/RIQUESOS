'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { ClienteResponse } from '@/presentation/dtos';
import { EditarClienteDialog } from '@/components/forms/editar-cliente-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarCliente } from '@/presentation/actions/clientes';
import { toast } from 'sonner';
import { revalidatePath } from 'next/cache';

export function ClienteActions({ cliente }: { cliente: ClienteResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', cliente.id);
    const result = await eliminarCliente(formData);
    if (result.success) {
      toast.success('Cliente eliminado exitosamente');
    } else {
      toast.error(result.error || 'Error al eliminar cliente');
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

export const clienteColumns: ColumnDef<ClienteResponse, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => {
      const tipo = row.getValue('tipo') as string;
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tipo === 'MAYORISTA' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
          {tipo}
        </span>
      );
    },
  },
  {
    accessorKey: 'precioDobleCrema',
    header: 'Precio Doble Crema',
    cell: ({ row }) => {
      const value = row.getValue('precioDobleCrema') as string | null;
      return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
    },
  },
  {
    accessorKey: 'precioSemisalado',
    header: 'Precio Semisalado',
    cell: ({ row }) => {
      const value = row.getValue('precioSemisalado') as string | null;
      return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <ClienteActions cliente={row.original} />,
  },
];