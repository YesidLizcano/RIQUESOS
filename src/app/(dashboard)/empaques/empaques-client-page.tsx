'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { createEmpaqueColumns } from '@/components/columns/empaque-columns';
import { CrearEmpaqueDialog } from '@/components/forms/crear-empaque-dialog';
import { getEmpaques, getEmpaquesIncludeDeleted } from '@/presentation/actions/empaques';
import { RefreshContext } from '@/components/refresh-context';
import type { EmpaqueResponse } from '@/presentation/dtos';

interface EmpaquesClientPageProps {
  empaques: EmpaqueResponse[];
}

export function EmpaquesClientPage({ empaques }: EmpaquesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [data, setData] = useState<EmpaqueResponse[]>(empaques);

  useEffect(() => {
    setData(empaques);
  }, [empaques]);

  const refreshData = useCallback(async () => {
    if (showDeleted) {
      const result = await getEmpaquesIncludeDeleted();
      if (result.success && result.empaques) {
        setData(result.empaques);
      }
    } else {
      const result = await getEmpaques();
      if (result.success && result.empaques) {
        setData(result.empaques);
      }
    }
  }, [showDeleted]);

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    if (checked) {
      const result = await getEmpaquesIncludeDeleted();
      if (result.success && result.empaques) {
        setData(result.empaques);
      }
    } else {
      const result = await getEmpaques();
      if (result.success && result.empaques) {
        setData(result.empaques);
      }
    }
  }, []);

  const columns = createEmpaqueColumns(showDeleted);

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
    <RefreshContext.Provider value={refreshData}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empaques</h1>
            <p className="text-muted-foreground">Gestión de inventario de empaques</p>
          </div>
          <CrearEmpaqueDialog />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {data.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay empaques registrados</p>
            ) : (
              <>
                <DataTableToolbar
                  table={table}
                  searchPlaceholder="Buscar empaques..."
                  showDeleted={showDeleted}
                  onShowDeletedChange={handleShowDeletedChange}
                />
                <DataTable table={table} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RefreshContext.Provider>
  );
}