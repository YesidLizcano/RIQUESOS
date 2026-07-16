'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { ClienteResponse } from '@/presentation/dtos';
import { EditarClienteDialog } from '@/components/forms/editar-cliente-dialog';
import { EntityActions } from '@/components/entity-actions';
import { eliminarCliente, restaurarCliente } from '@/presentation/actions/clientes';
import { TipoCliente } from '@/domain/enums';
import { tipoClienteLabel } from '@/domain/labels';
import { History } from 'lucide-react';

export function createClienteColumns(
  showDeleted?: boolean,
  onViewHistory?: (cliente: ClienteResponse) => void,
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
      id: 'actions',
      header: 'Acciones',
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {onViewHistory && row.original.deletedAt === null && (
            <button
              onClick={() => onViewHistory(row.original)}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Ver Historial"
              aria-label="Ver Historial"
            >
              <History className="size-4" />
            </button>
          )}
          <EntityActions
            entityId={row.original.id}
            entityName={`el cliente "${row.original.nombre}"`}
            isDeleted={row.original.deletedAt !== null}
            deleteAction={eliminarCliente}
            restoreAction={restaurarCliente}
            deleteToastLabel="Cliente"
            renderEditDialog={(open, onOpenChange) => (
              <EditarClienteDialog cliente={row.original} open={open} onOpenChange={onOpenChange} />
            )}
          />
        </div>
      ),
    },
  ];
}

// Keep backward-compatible export for pages that don't need deleted toggle
export const clienteColumns = createClienteColumns();