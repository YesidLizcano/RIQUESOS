'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Package } from 'lucide-react';
import type { EmpaqueResponse } from '@/presentation/dtos';
import { EditarEmpaqueDialog } from '@/components/forms/editar-empaque-dialog';
import { EntityActions } from '@/components/entity-actions';
import { eliminarEmpaque, restaurarEmpaque } from '@/presentation/actions/empaques';
import { categoriaInsumoLabel } from '@/domain/labels';

export function createEmpaqueColumns(showDeleted?: boolean): ColumnDef<EmpaqueResponse, unknown>[] {
  return [
    {
      accessorKey: 'categoria',
      header: 'Categoría',
      cell: ({ row }) => {
        const empaque = row.original;
        const isDeleted = empaque.deletedAt !== null;
        const label = categoriaInsumoLabel[empaque.categoria] ?? empaque.categoria;
        return (
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className={isDeleted ? 'line-through opacity-50' : ''}>
              {label}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const empaque = row.original;
        const stock = Number(empaque.stock);
        const isDeleted = empaque.deletedAt !== null;
        const display = empaque.categoria === 'SEPARADOR'
          ? `${stock.toLocaleString('es-AR')} kg`
          : String(Math.round(stock));
        return (
          <span className={(stock <= 0 && !isDeleted) ? 'text-destructive font-medium' : ''}>
            {display}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <EntityActions
          entityId={row.original.id}
          entityName={`el insumo "${row.original.tipo}"`}
          isDeleted={row.original.deletedAt !== null}
          deleteAction={eliminarEmpaque}
          restoreAction={restaurarEmpaque}
          deleteToastLabel="Insumo"
          renderEditDialog={(open, onOpenChange) => (
            <EditarEmpaqueDialog empaque={row.original} open={open} onOpenChange={onOpenChange} />
          )}
        />
      ),
    },
  ];
}