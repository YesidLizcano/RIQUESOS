'use client';

import { useState, useMemo, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createVentaColumns } from '@/components/columns/venta-columns';
import { RegistrarVentaDialog } from '@/components/forms/registrar-venta-dialog';
import { PeriodSelector } from '@/components/period-selector';
import { getVentasByDateRange } from '@/presentation/actions/ventas';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { VentaResponse, ClienteResponse, LoteResponse } from '@/presentation/dtos';
import { TipoProducto } from '@/domain/enums';

const PRODUCTO_LABELS: Record<string, string> = {
  DOBLE_CREMA: 'Doble Crema',
  SEMISALADO: 'Semisalado',
};

const ventaExportMap = [
  { key: 'fecha', header: 'Fecha' },
  { key: 'clienteNombre', header: 'Cliente' },
  { key: 'domiciliario', header: 'Domiciliario' },
  { key: 'producto', header: 'Producto', format: (v: unknown) => PRODUCTO_LABELS[v as string] ?? v },
  { key: 'cantidadVendidaKg', header: 'Cantidad (Kg)', format: (v: unknown) => Number(v) },
  { key: 'precioVentaKg', header: 'Precio/Kg', format: (v: unknown) => Number(v) },
  { key: 'ingresoTotal', header: 'Ingreso Total', format: (v: unknown) => Number(v) },
  { key: 'gananciaBruta', header: 'Ganancia Bruta', format: (v: unknown) => Number(v) },
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface VentasClientPageProps {
  initialVentas: VentaResponse[];
  clientes: ClienteResponse[];
  lotes: LoteResponse[];
  initialMonth: number;
  initialYear: number;
}

type VentaRow = VentaResponse & { producto: string };

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
];

export function VentasClientPage({ initialVentas, clientes, lotes, initialMonth, initialYear }: VentasClientPageProps) {
  const [ventas, setVentas] = useState<VentaResponse[]>(initialVentas);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);

  // Sync when server data changes (e.g. after router.refresh())
  useEffect(() => {
    setVentas(initialVentas);
  }, [initialVentas]);

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

  const { exportExcel, isExporting } = useExportExcel(table, ventaExportMap, 'Ventas');

  const handlePeriodChange = async (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setLoading(true);

    try {
      const result = await getVentasByDateRange(newMonth, newYear);
      if (result.success && result.ventas) {
        setVentas(result.ventas);
      }
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = month === -1 ? 'Todos' : `${MESES[month]} ${year}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Registro de ventas — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            month={month}
            year={year}
            onPeriodChange={handlePeriodChange}
          />
          <RegistrarVentaDialog clientes={clientes} lotes={lotes} />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Actualizando ventas...</p>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          {ventas.length === 0 && !loading ? (
            <p className="text-muted-foreground text-center py-8">No hay ventas en el período seleccionado</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar ventas..."
                filters={filters}
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