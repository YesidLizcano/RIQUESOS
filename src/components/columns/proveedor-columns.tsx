'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { ProveedorResponse } from '@/presentation/dtos';
import { EditarProveedorDialog } from '@/components/forms/editar-proveedor-dialog';
import { EntityActions } from '@/components/entity-actions';
import { eliminarProveedor, restaurarProveedor } from '@/presentation/actions/proveedores';
import { Package } from 'lucide-react';

export function createProveedorColumns(
  showDeleted?: boolean,
  onVerLotes?: (proveedor: ProveedorResponse) => void
): ColumnDef<ProveedorResponse, unknown>[] {
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
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {!row.original.deletedAt && onVerLotes && (
            <button
              onClick={() => onVerLotes(row.original)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Ver Lotes"
              aria-label="Ver lotes del proveedor"
            >
              <Package className="size-4" />
            </button>
          )}
          <EntityActions
            entityId={row.original.id}
            entityName={`el proveedor "${row.original.nombre}"`}
            isDeleted={row.original.deletedAt !== null}
            deleteAction={eliminarProveedor}
            restoreAction={restaurarProveedor}
            deleteToastLabel="Proveedor"
            renderEditDialog={(open, onOpenChange) => (
              <EditarProveedorDialog proveedor={row.original} open={open} onOpenChange={onOpenChange} />
            )}
          />
        </div>
      ),
    },
  ];
}

// Keep backward-compatible export for pages that don't need deleted toggle
export const proveedorColumns = createProveedorColumns();