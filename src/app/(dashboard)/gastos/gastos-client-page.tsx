'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { createGastoColumns } from '@/components/columns/gasto-columns';
import { CrearGastoFijoDialog } from '@/components/forms/crear-gasto-fijo-dialog';
import { PeriodSelector } from '@/components/period-selector';
import { getGastosByDateRange, getGastosIncludeDeleted } from '@/presentation/actions/gastos';
import { useExportExcel } from '@/hooks/use-export-excel';
import { RefreshContext } from '@/components/refresh-context';
import type { GastoResponse } from '@/presentation/dtos';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const gastoExportMap = [
  { key: 'concepto', header: 'Concepto' },
  { key: 'valor', header: 'Valor', format: (v: unknown) => Number(v) },
  { key: 'fecha', header: 'Fecha' },
];

interface GastosClientPageProps {
  initialGastos: GastoResponse[];
  initialMonth: number;
  initialYear: number;
}

export function GastosClientPage({ initialGastos, initialMonth, initialYear }: GastosClientPageProps) {
  const [gastos, setGastos] = useState<GastoResponse[]>(initialGastos);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Sync when server data changes (fallback for initial load)
  useEffect(() => {
    setGastos(initialGastos);
  }, [initialGastos]);

  const columns = createGastoColumns(showDeleted);

  const table = useReactTable({
    data: gastos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  const { exportExcel, isExporting } = useExportExcel(table, gastoExportMap, 'Gastos');

  // Total of ALL period-filtered data (not just current page)
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.valor), 0);

  const handlePeriodChange = async (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setLoading(true);

    try {
      const result = await getGastosByDateRange(newMonth, newYear);
      if (result.success && result.gastos) {
        setGastos(result.gastos);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    if (checked) {
      const result = await getGastosIncludeDeleted();
      if (result.success && result.gastos) {
        setGastos(result.gastos);
      }
    } else {
      // Re-fetch active-only gastos for current period
      const result = await getGastosByDateRange(month, year);
      if (result.success && result.gastos) {
        setGastos(result.gastos);
      }
    }
  }, [month, year]);

  const refreshData = useCallback(async () => {
    if (showDeleted) {
      const result = await getGastosIncludeDeleted();
      if (result.success && result.gastos) {
        setGastos(result.gastos);
      }
    } else {
      const result = await getGastosByDateRange(month, year);
      if (result.success && result.gastos) {
        setGastos(result.gastos);
      }
    }
  }, [showDeleted, month, year]);

  const periodLabel = month === -1 ? 'Todos' : `${MESES[month]} ${year}`;

  return (
    <RefreshContext.Provider value={refreshData}>
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos Fijos</h1>
          <p className="text-muted-foreground">Gestión de gastos fijos — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            month={month}
            year={year}
            onPeriodChange={handlePeriodChange}
          />
          <CrearGastoFijoDialog />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Actualizando gastos...</p>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          {gastos.length === 0 && !loading ? (
            <p className="text-muted-foreground text-center py-8">No hay gastos en el período seleccionado</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar gastos..."
                showDeleted={showDeleted}
                onShowDeletedChange={handleShowDeletedChange}
                onExportExcel={exportExcel}
                isExporting={isExporting}
              />
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
    </RefreshContext.Provider>
  );
}