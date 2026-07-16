'use client';

import { useState, useMemo, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createClienteColumns } from '@/components/columns/cliente-columns';
import { CrearClienteDialog } from '@/components/forms/crear-cliente-dialog';
import { HistorialClienteDialog } from '@/components/historial-cliente-dialog';
import { getClientes, getClientesIncludeDeleted } from '@/presentation/actions/clientes';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { ColumnType } from '@/hooks/use-export-excel';
import { RefreshContext } from '@/components/refresh-context';
import { DeferredMount } from '@/components/deferred-mount';
import type { ClienteResponse } from '@/presentation/dtos';
import { TipoCliente } from '@/domain/enums';

const TIPO_LABELS: Record<string, string> = {
  MAYORISTA: 'Mayorista',
  MINORISTA: 'Minorista',
};

const clienteExportMap = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'tipo', header: 'Tipo', format: (v: unknown) => TIPO_LABELS[String(v)] ?? String(v) },
  { key: 'precioDobleCrema', header: 'Precio Doble Crema', type: 'currency' as ColumnType },
  { key: 'precioSemisalado', header: 'Precio Semisalado', type: 'currency' as ColumnType },
];

interface ClientesClientPageProps {
  clientes: ClienteResponse[];
}

const tipoFilterOptions = [
  { label: 'Mayorista', value: TipoCliente.MAYORISTA },
  { label: 'Minorista', value: TipoCliente.MINORISTA },
];

export function ClientesClientPage({ clientes }: ClientesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ClienteResponse[]>(clientes);
  const [clienteToView, setClienteToView] = useState<ClienteResponse | null>(null);

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'tipo', label: 'Tipo', options: tipoFilterOptions },
    ],
    []
  );

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (showDeleted) {
        const result = await getClientesIncludeDeleted();
        if (result.success && result.clientes) {
          setData(result.clientes);
        }
      } else {
        const result = await getClientes();
        if (result.success && result.clientes) {
          setData(result.clientes);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted]);

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    setIsLoading(true);
    try {
      if (checked) {
        const result = await getClientesIncludeDeleted();
        if (result.success && result.clientes) {
          setData(result.clientes);
        }
      } else {
        setData(clientes);
      }
    } finally {
      setIsLoading(false);
    }
  }, [clientes]);

  const columns = createClienteColumns(showDeleted, setClienteToView);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  const { exportExcel, isExporting } = useExportExcel(table, clienteExportMap, 'Clientes');

  return (
    <RefreshContext.Provider value={refreshData}>
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes</p>
        </div>
        <CrearClienteDialog />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <DeferredMount>
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
                onExportExcel={exportExcel}
                isExporting={isExporting}
              />
              <DataTable table={table} isLoading={isLoading} emptyMessage="No hay clientes registrados" />
            </>
          )}
          </DeferredMount>
        </CardContent>
      </Card>

      <HistorialClienteDialog
        cliente={clienteToView}
        open={clienteToView !== null}
        onOpenChange={(open) => { if (!open) setClienteToView(null); }}
      />
    </div>
    </RefreshContext.Provider>
  );
}