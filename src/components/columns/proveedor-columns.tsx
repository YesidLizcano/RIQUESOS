'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { ProveedorResponse } from '@/presentation/dtos';
import { EditarProveedorDialog } from '@/components/forms/editar-proveedor-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarProveedor } from '@/presentation/actions/proveedores';
import { toast } from 'sonner';

export function ProveedorActions({ proveedor }: { proveedor: ProveedorResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

export const proveedorColumns: ColumnDef<ProveedorResponse, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
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
    cell: ({ row }) => <ProveedorActions proveedor={row.original} />,
  },
];