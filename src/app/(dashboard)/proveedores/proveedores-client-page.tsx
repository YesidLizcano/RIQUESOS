'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { createProveedorColumns } from '@/components/columns/proveedor-columns';
import { CrearProveedorDialog } from '@/components/forms/crear-proveedor-dialog';
import { getProveedoresIncludeDeleted } from '@/presentation/actions/proveedores';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { ProveedorResponse } from '@/presentation/dtos';

const proveedorExportMap = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'telefono', header: 'Teléfono' },
];

interface ProveedoresClientPageProps {
  proveedores: ProveedorResponse[];
}

export function ProveedoresClientPage({ proveedores }: ProveedoresClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [data, setData] = useState<ProveedorResponse[]>(proveedores);

  // Sync when server data changes (e.g. after router.refresh())
  useEffect(() => {
    setData(proveedores);
  }, [proveedores]);

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    if (checked) {
      const result = await getProveedoresIncludeDeleted();
      if (result.success && result.proveedores) {
        setData(result.proveedores);
      }
    } else {
      // Reset to original active-only data
      setData(proveedores);
    }
  }, [proveedores]);

  const columns = createProveedorColumns(showDeleted);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  const { exportExcel, isExporting } = useExportExcel(table, proveedorExportMap, 'Proveedores');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores</p>
        </div>
        <CrearProveedorDialog />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay proveedores registrados</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar proveedores..."
                showDeleted={showDeleted}
                onShowDeletedChange={handleShowDeletedChange}
                onExportExcel={exportExcel}
                isExporting={isExporting}
              />
              <DataTable table={table} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}