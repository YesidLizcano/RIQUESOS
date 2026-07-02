'use client';

import { useMemo } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { gastoColumns } from '@/components/columns/gasto-columns';
import { CrearGastoFijoDialog } from '@/components/forms/crear-gasto-fijo-dialog';
import type { GastoResponse } from '@/presentation/dtos';

interface GastosClientPageProps {
  gastos: GastoResponse[];
}

export function GastosClientPage({ gastos }: GastosClientPageProps) {
  const table = useReactTable({
    data: gastos,
    columns: gastoColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.valor), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos Fijos</h1>
          <p className="text-muted-foreground">Gestión de gastos fijos mensuales</p>
        </div>
        <CrearGastoFijoDialog />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {gastos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay gastos fijos registrados</p>
          ) : (
            <>
              <DataTableToolbar table={table} searchPlaceholder="Buscar gastos..." />
              <DataTable
                table={table}
                footerRow={
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right">
                      ${totalGastos.toLocaleString('es-AR')}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}