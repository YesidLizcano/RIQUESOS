'use client';

import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { proveedorColumns } from '@/components/columns/proveedor-columns';
import { CrearProveedorDialog } from '@/components/forms/crear-proveedor-dialog';
import type { ProveedorResponse } from '@/presentation/dtos';

interface ProveedoresClientPageProps {
  proveedores: ProveedorResponse[];
}

export function ProveedoresClientPage({ proveedores }: ProveedoresClientPageProps) {
  const table = useReactTable({
    data: proveedores,
    columns: proveedorColumns,
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
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores</p>
        </div>
        <CrearProveedorDialog />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {proveedores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay proveedores registrados</p>
          ) : (
            <>
              <DataTableToolbar table={table} searchPlaceholder="Buscar proveedores..." />
              <DataTable table={table} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}