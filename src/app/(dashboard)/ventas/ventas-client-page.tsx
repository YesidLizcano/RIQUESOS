'use client';

import { useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createVentaColumns } from '@/components/columns/venta-columns';
import { RegistrarVentaDialog } from '@/components/forms/registrar-venta-dialog';
import type { VentaResponse, ClienteResponse, LoteResponse } from '@/presentation/dtos';
import { TipoProducto } from '@/domain/enums';

interface VentasClientPageProps {
  ventas: VentaResponse[];
  clientes: ClienteResponse[];
  lotes: LoteResponse[];
}

type VentaRow = VentaResponse & { producto: string };

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
];

export function VentasClientPage({ ventas, clientes, lotes }: VentasClientPageProps) {
  const clienteMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.nombre])),
    [clientes]
  );

  const clienteFilterOptions = useMemo(
    () => clientes.map((c) => ({ label: c.nombre, value: c.id })),
    [clientes]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'clienteNombre', label: 'Cliente', options: clienteFilterOptions },
      { columnId: 'producto', label: 'Producto', options: productoFilterOptions },
    ],
    [clienteFilterOptions]
  );

  // Enrich ventas with producto from lote for filtering
  const enrichedVentas: VentaRow[] = useMemo(() => {
    const loteMap = new Map(lotes.map((l) => [l.id, l.producto]));
    return ventas.map((v) => ({
      ...v,
      producto: loteMap.get(v.loteId) ?? '',
    }));
  }, [ventas, lotes]);

  const columns = useMemo(
    () => createVentaColumns(clienteMap),
    [clienteMap]
  );

  const table = useReactTable({
    data: enrichedVentas,
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
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Registro de ventas del período actual</p>
        </div>
        <RegistrarVentaDialog clientes={clientes} lotes={lotes} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {ventas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay ventas en el período actual</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar ventas..."
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