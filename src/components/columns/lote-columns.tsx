'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import type { LoteResponse } from '@/presentation/dtos';
import { EditarLoteDialog } from '@/components/forms/editar-lote-dialog';
import { DeleteConfirmDialog } from '@/components/forms/delete-confirm-dialog';
import { eliminarLote, restaurarLote } from '@/presentation/actions/lotes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { bloquesCompletos, kgParciales, isDobleCrema, DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';

export interface AlertaInfo {
  stockSeverity?: 'warning' | 'critical';
  ageSeverity?: 'warning' | 'critical';
  diasEnInventario: number;
}

export function LoteActions({ lote }: { lote: LoteResponse }) {
  const refreshData = useRefresh();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDeleted = lote.deletedAt !== null;

  async function handleDelete() {
    const formData = new FormData();
    formData.set('id', lote.id);
    const result = await eliminarLote(formData);
    if (result.success) {
      toast.success('Lote eliminado exitosamente');
      refreshData();
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
      refreshData();
    } else {
      toast.error(result.error || 'Error al restaurar lote');
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
      header: 'Cant. Comprada',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const kg = Number(row.getValue('cantidadCompradaKg'));
        const producto = row.original.producto;
        if (isDobleCrema(producto)) {
          const enteros = row.original.bloquesEnteros;
          const tajados = row.original.bloquesTajados;
          const fabrica = row.original.bloquesTajadosDeFabrica;
          return (
            <span>
              {enteros + tajados + fabrica} bloques ({kg.toLocaleString('es-AR')} kg)
            </span>
          );
        }
        return `${kg.toLocaleString('es-AR')} kg`;
      },
    },
    {
      accessorKey: 'precioCompraBaseKg',
      header: 'Precio',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const producto = row.original.producto;
        const precioBase = Number(row.getValue('precioCompraBaseKg'));
        const precioBloque = Number(row.original.precioPorBloque);
        if (isDobleCrema(producto) && precioBloque > 0) {
          return (
            <span>
              ${precioBloque.toLocaleString('es-AR')}/bloque (${precioBase.toLocaleString('es-AR', { minimumFractionDigits: 2 })}/kg)
            </span>
          );
        }
        return `$${precioBase.toLocaleString('es-AR')}/kg`;
      },
    },
    {
      accessorKey: 'costoRealCalculadoKg',
      header: 'Costo Real/Kg',
      enableGlobalFilter: false,
      cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
    },
    {
      accessorKey: 'stockDisponibleKg',
      header: 'Stock Disp.',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const stockValue = Number(row.getValue('stockDisponibleKg'));
        const producto = row.original.producto;
        const info = alertMap?.get(row.original.id);
        const severity = info?.stockSeverity;

        const stockText = isDobleCrema(producto)
          ? (() => {
              const enteros = row.original.bloquesEnteros;
              const tajados = row.original.bloquesTajados;
              if (enteros > 0 && tajados > 0) {
                return `${enteros} completos + ${tajados} tajados (${stockValue.toLocaleString('es-AR')} kg)`;
              }
              if (tajados > 0) {
                return `${tajados} tajados (${stockValue.toLocaleString('es-AR')} kg)`;
              }
              return `${enteros} bloques (${stockValue.toLocaleString('es-AR')} kg)`;
            })()
          : `${stockValue.toLocaleString('es-AR')} kg`;

        if (severity === 'critical') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{stockText}</span>
              <Badge variant="destructive">Crítico</Badge>
            </div>
          );
        }
        if (severity === 'warning') {
          return (
            <div className="flex items-center gap-1.5">
              <span>{stockText}</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Bajo</Badge>
            </div>
          );
        }
        return stockText;
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