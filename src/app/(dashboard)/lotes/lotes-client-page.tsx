'use client';

import { useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createLoteColumns } from '@/components/columns/lote-columns';
import { CrearLoteDialog } from '@/components/forms/crear-lote-dialog';
import type { LoteResponse, ProveedorResponse } from '@/presentation/dtos';
import { TipoProducto, EstadoLote } from '@/domain/enums';

interface LotesClientPageProps {
  lotes: LoteResponse[];
  proveedores: ProveedorResponse[];
}

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
];

const estadoFilterOptions = [
  { label: 'Activo', value: EstadoLote.ACTIVO },
  { label: 'Agotado', value: EstadoLote.AGOTADO },
];

export function LotesClientPage({ lotes, proveedores }: LotesClientPageProps) {
  const proveedorMap = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores]
  );

  const proveedorFilterOptions = useMemo(
    () => proveedores.map((p) => ({ label: p.nombre, value: p.id })),
    [proveedores]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'producto', label: 'Producto', options: productoFilterOptions },
      { columnId: 'estado', label: 'Estado', options: estadoFilterOptions },
      { columnId: 'proveedorNombre', label: 'Proveedor', options: proveedorFilterOptions },
    ],
    [proveedorFilterOptions]
  );

  const columns = useMemo(
    () => createLoteColumns(proveedorMap),
    [proveedorMap]
  );

  const table = useReactTable({
    data: lotes,
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
          <h1 className="text-3xl font-bold tracking-tight">Lotes</h1>
          <p className="text-muted-foreground">Gestión de lotes de queso</p>
        </div>
        <CrearLoteDialog proveedores={proveedores} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {lotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay lotes</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar lotes..."
                filters={filters}
              />
              <DataTable table={table} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}