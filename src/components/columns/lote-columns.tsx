'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { LoteResponse } from '@/presentation/dtos';
import { EditarLoteDialog } from '@/components/forms/editar-lote-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarLote, restaurarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { startTransition } from 'react';
import { Badge } from '@/components/ui/badge';

export interface AlertaInfo {
  stockSeverity?: 'warning' | 'critical';
  ageSeverity?: 'warning' | 'critical';
  diasEnInventario: number;
}

export function LoteActions({ lote }: { lote: LoteResponse }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = lote.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', lote.id);
    const result = await eliminarLote(formData);
    if (result.success) {
      toast.success('Lote eliminado exitosamente');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al eliminar lote');
    }
  }

  async function handleRestore() {
    const formData = new FormData();
    formData.set('id', lote.id);
    const result = await restaurarLote(formData);
    if (result.success) {
      toast.success('Lote restaurado exitosamente');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al restaurar lote');
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

export function createLoteColumns(
  proveedorMap?: Map<string, string>,
  showDeleted?: boolean,
  alertMap?: Map<string, AlertaInfo>
): ColumnDef<LoteResponse, unknown>[] {
  return [
    {
      accessorKey: 'producto',
      header: 'Producto',
      cell: ({ row }) => {
        const producto = row.getValue('producto') as string;
        const isDeleted = row.original.deletedAt !== null;
        return (
          <span className={isDeleted ? 'line-through opacity-50' : ''}>
            {producto === 'DOBLE_CREMA' ? 'Doble Crema' : 'Semisalado'}
          </span>
        );
      },
    },
    {
      id: 'proveedorNombre',
      header: 'Proveedor',
      accessorFn: (row) => {
        if (proveedorMap) {
          return proveedorMap.get(row.proveedorId) ?? row.proveedorId;
        }
        return row.proveedorId;
      },
      filterFn: (row, _columnId, filterValue) => {
        return row.original.proveedorId === filterValue;
      },
    },
    {
      accessorKey: 'cantidadCompradaKg',
      header: 'Cant. Comprada (Kg)',
      enableGlobalFilter: false,
      cell: ({ row }) => Number(row.getValue('cantidadCompradaKg')).toLocaleString('es-AR'),
    },
    {
      accessorKey: 'precioCompraBaseKg',
      header: 'Precio Base/Kg',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('precioCompraBaseKg')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'costoRealCalculadoKg',
      header: 'Costo Real/Kg',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'stockDisponibleKg',
      header: 'Stock Disp. (Kg)',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const stockValue = Number(row.getValue('stockDisponibleKg'));
        const info = alertMap?.get(row.original.id);
        const severity = info?.stockSeverity;

        if (severity === 'critical') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{stockValue.toLocaleString('es-AR')}</span>
              <Badge variant="destructive">Crítico</Badge>
            </div>
          );
        }
        if (severity === 'warning') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{stockValue.toLocaleString('es-AR')}</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Bajo</Badge>
            </div>
          );
        }
        return stockValue.toLocaleString('es-AR');
      },
    },
    {
      id: 'diasEnInventario',
      header: 'Días en Inv.',
      enableGlobalFilter: false,
      accessorFn: (row) => {
        const info = alertMap?.get(row.id);
        return info?.diasEnInventario ?? (() => {
          const ingreso = new Date(row.fechaIngreso);
          const hoy = new Date();
          const msPerDay = 1000 * 60 * 60 * 24;
          const laterDay = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          const earlierDay = Date.UTC(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
          return Math.floor((laterDay - earlierDay) / msPerDay);
        })();
      },
      cell: ({ row }) => {
        const info = alertMap?.get(row.original.id);
        const dias = info?.diasEnInventario ?? (() => {
          const ingreso = new Date(row.original.fechaIngreso);
          const hoy = new Date();
          const msPerDay = 1000 * 60 * 60 * 24;
          const laterDay = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
          const earlierDay = Date.UTC(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
          return Math.floor((laterDay - earlierDay) / msPerDay);
        })();
        const ageSeverity = info?.ageSeverity;

        if (ageSeverity === 'critical') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{dias}</span>
              <Badge variant="destructive">60+ días</Badge>
            </div>
          );
        }
        if (ageSeverity === 'warning') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{dias}</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">30+</Badge>
            </div>
          );
        }
        return <span>{dias}</span>;
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      enableGlobalFilter: false,
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
      enableGlobalFilter: false,
      cell: ({ row }) => <LoteActions lote={row.original} />,
    },
  ];
}

// Keep backward-compatible export for pages that don't need FK resolution
export const loteColumns = createLoteColumns();