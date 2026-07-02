'use client';

import { useState, useMemo, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createClienteColumns } from '@/components/columns/cliente-columns';
import { CrearClienteDialog } from '@/components/forms/crear-cliente-dialog';
import { getClientesIncludeDeleted } from '@/presentation/actions/clientes';
import type { ClienteResponse } from '@/presentation/dtos';
import { TipoCliente } from '@/domain/enums';

interface ClientesClientPageProps {
  clientes: ClienteResponse[];
}

const tipoFilterOptions = [
  { label: 'Mayorista', value: TipoCliente.MAYORISTA },
  { label: 'Minorista', value: TipoCliente.MINORISTA },
];

export function ClientesClientPage({ clientes }: ClientesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [data, setData] = useState<ClienteResponse[]>(clientes);

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'tipo', label: 'Tipo', options: tipoFilterOptions },
    ],
    []
  );

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    if (checked) {
      const result = await getClientesIncludeDeleted();
      if (result.success && result.clientes) {
        setData(result.clientes);
      }
    } else {
      setData(clientes);
    }
  }, [clientes]);

  const columns = createClienteColumns(showDeleted);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes</p>
        </div>
        <CrearClienteDialog />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay clientes registrados</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar clientes..."
                filters={filters}
                showDeleted={showDeleted}
                onShowDeletedChange={handleShowDeletedChange}
              />
              <DataTable table={table} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}