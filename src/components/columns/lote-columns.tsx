'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import type { LoteResponse } from '@/presentation/dtos';
import { EditarLoteDialog } from '@/components/forms/editar-lote-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';

export function LoteActions({ lote }: { lote: LoteResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', lote.id);
    const result = await eliminarLote(formData);
    if (result.success) {
      toast.success('Lote eliminado exitosamente');
    } else {
      toast.error(result.error || 'Error al eliminar lote');
    }
  }

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
        title="Editar costos"
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
      <EditarLoteDialog lote={lote} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={`el lote de ${lote.producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'}`}
        onConfirm={handleDelete}
      />
    </>
  );
}

export const loteColumns: ColumnDef<LoteResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
    cell: ({ row }) => {
      const producto = row.getValue('producto') as string;
      return producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado';
    },
  },
  {
    accessorKey: 'proveedorId',
    header: 'Proveedor',
  },
  {
    accessorKey: 'cantidadCompradaKg',
    header: 'Cant. Comprada (Kg)',
    cell: ({ row }) => Number(row.getValue('cantidadCompradaKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'precioCompraBaseKg',
    header: 'Precio Base/Kg',
    cell: ({ row }) => `$${Number(row.getValue('precioCompraBaseKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'costoRealCalculadoKg',
    header: 'Costo Real/Kg',
    cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'stockDisponibleKg',
    header: 'Stock Disp. (Kg)',
    cell: ({ row }) => Number(row.getValue('stockDisponibleKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as string;
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estado === 'ACTIVO' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary-foreground'}`}>
          {estado}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => <LoteActions lote={row.original} />,
  },
];