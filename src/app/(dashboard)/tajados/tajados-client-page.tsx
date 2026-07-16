'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createTajadoColumns } from '@/components/columns/tajado-columns';
import { DateRangePicker } from '@/components/date-range-picker';
import { getTajados, marcarTajadoPagado } from '@/presentation/actions/tajados';
import { RefreshContext } from '@/components/refresh-context';
import { DeferredMount } from '@/components/deferred-mount';
import type { TajadoResponse } from '@/presentation/dtos';

const estadoFilterOptions = [
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Pagados', value: 'PAGADO' },
];

interface TajadosClientPageProps {
  tajados: TajadoResponse[];
  initialEstado?: string;
}

export function TajadosClientPage({ tajados, initialEstado }: TajadosClientPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TajadoResponse[]>(tajados);
  const [inicio, setInicio] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fin, setFin] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const handleMarcarPagado = useCallback(async (id: string) => {
    const result = await marcarTajadoPagado(id);
    if (result.success) {
      await refreshData();
    }
  }, []);

  const columns = useMemo(
    () => createTajadoColumns({ onMarcarPagado: handleMarcarPagado }),
    [handleMarcarPagado]
  );

  // Get unique tajadores for filter
  const tajadorFilterOptions = useMemo(
    () => {
      const unique = [...new Set(data.map((t) => t.tajador))].sort();
      return unique.map((t) => ({ label: t, value: t }));
    },
    [data]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'estadoPago', label: 'Estado', options: estadoFilterOptions },
      { columnId: 'tajador', label: 'Tajador', options: tajadorFilterOptions },
    ],
    [tajadorFilterOptions]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  // Apply initial filter after mount
  useEffect(() => {
    if (initialEstado) {
      table.getColumn('estadoPago')?.setFilterValue(initialEstado);
    }
  }, [initialEstado, table]);

  // Totals from filtered rows
  const filteredTotals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;
    const visible = rows.map((row) => row.original as TajadoResponse);
    const totalBloques = visible.reduce((sum, t) => sum + t.cantidadBloques, 0);
    const totalPendiente = visible
      .filter((t) => t.estadoPago === 'PENDIENTE')
      .reduce((sum, t) => sum + Number(t.costoTotal), 0);
    const totalPagado = visible
      .filter((t) => t.estadoPago === 'PAGADO')
      .reduce((sum, t) => sum + Number(t.costoTotal), 0);
    return { count: visible.length, totalBloques, totalPendiente, totalPagado };
  }, [table.getFilteredRowModel().rows]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTajados(inicio, fin);
      if (result.success && result.tajados) {
        setData(result.tajados);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inicio, fin]);

  const handleDateRangeChange = useCallback((newInicio: string, newFin: string) => {
    setInicio(newInicio);
    setFin(newFin);
  }, []);

  // Refresh when date range changes
  useEffect(() => {
    refreshData();
  }, [inicio, fin, refreshData]);

  return (
    <RefreshContext.Provider value={refreshData}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Historial de Tajados</h1>
            <p className="text-muted-foreground">Registro de cortes y pagos a tajadores</p>
          </div>
          <DateRangePicker
            inicio={inicio}
            fin={fin}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <DeferredMount>
              {data.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay tajados en este período</p>
              ) : (
                <>
                  <DataTableToolbar
                    table={table}
                    searchPlaceholder="Buscar tajados..."
                    filters={filters}
                  />
                  <DataTable
                    table={table}
                    isLoading={isLoading}
                    emptyMessage="No hay tajados registrados"
                    footerRow={
                      filteredTotals.count > 0 ? (
                        <tr className="border-t-2 bg-muted/30 font-semibold">
                          <td className="px-3 py-2" colSpan={3}>
                            Total ({filteredTotals.count} tajado{filteredTotals.count !== 1 ? 's' : ''})
                          </td>
                          <td className="px-3 py-2 text-center">{filteredTotals.totalBloques}</td>
                          <td className="px-3 py-2" colSpan={2}>
                            <span className="text-xs text-muted-foreground mr-1">Pendiente:</span>
                            <span className={filteredTotals.totalPendiente === 0 ? 'text-green-600' : 'text-amber-600'}>
                              ${Math.round(filteredTotals.totalPendiente).toLocaleString('es-AR')}
                            </span>
                            <span className="text-xs text-muted-foreground ml-3 mr-1">Pagado:</span>
                            <span className="text-green-600">
                              ${Math.round(filteredTotals.totalPagado).toLocaleString('es-AR')}
                            </span>
                          </td>
                          <td className="px-3 py-2" colSpan={1}></td>
                        </tr>
                      ) : undefined
                    }
                  />
                </>
              )}
            </DeferredMount>
          </CardContent>
        </Card>
      </div>
    </RefreshContext.Provider>
  );
}