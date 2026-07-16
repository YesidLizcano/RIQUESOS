'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createVentaColumns } from '@/components/columns/venta-columns';
import { RegistrarVentaDialog } from '@/components/forms/registrar-venta-dialog';
import { VentaDetalleDialog } from '@/components/venta-detalle-dialog';
import { AbonoPagoDialog } from '@/components/abono-pago-dialog';
import { DateRangePicker } from '@/components/date-range-picker';
import { getVentasByExactDateRange } from '@/presentation/actions/ventas';
import { getClientesIncludeDeleted } from '@/presentation/actions/clientes';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { ColumnType, ColumnMapItem } from '@/hooks/use-export-excel';
import { usePdfDownload } from '@/hooks/use-pdf-download';
import { VistaPreviaExcelDialog } from '@/components/dialogs/vista-previa-excel-dialog';

import { RefreshContext } from '@/components/refresh-context';
import { DeferredMount } from '@/components/deferred-mount';
import type { VentaResponse, ClienteResponse, LoteResponse, ProveedorResponse } from '@/presentation/dtos';
import { TipoProducto } from '@/domain/enums';
import { isDobleCrema, formatDobleCremaDetalle, formatDobleCremaGranel } from '@/domain/constants';
import { formatSSKg } from '@/domain/formatters';

const PRODUCTO_LABELS: Record<string, string> = {
  DOBLE_CREMA: 'Doble Crema',
  SEMISALADO: 'Semisalado',
  RECORTES_DOBLE_CREMA: 'Recortes DC',
};

const ventaExportMap = [
  { key: 'fecha', header: 'Fecha', type: 'date' as ColumnType },
  { key: 'clienteNombre', header: 'Cliente' },
  { key: 'sedeNombre', header: 'Sede' },
  { key: 'domiciliario', header: 'Domiciliario' },
  { key: 'metodoPago', header: 'Método de Pago', format: (v: unknown) => {
    const labels: Record<string, string> = { EFECTIVO: 'Efectivo', NEQUI: 'Nequi', BRE_B: 'Bre-B', CREDITO: 'Crédito' };
    return labels[String(v)] ?? String(v);
  }},
  { key: 'cantidadTotalKg', header: 'Cantidad', format: (_v: unknown, row: unknown) => {
    const venta = row as VentaResponse;
    const items = venta.items ?? [];
    const dcItems = items.filter((item) => {
      const producto = item.loteProducto ?? '';
      return isDobleCrema(producto);
    });
    const ssItems = items.filter((item) => {
      const producto = item.loteProducto ?? '';
      return !isDobleCrema(producto);
    });

    if (dcItems.length === 0) {
      // Pure SS venta — show kg
      return Number(venta.cantidadTotalKg);
    }

    if (ssItems.length === 0) {
      // Pure DC venta — aggregate blocks from items
      let totalEnteros = 0;
      let totalTajados = 0;
      let totalKgSueltosEntero = 0;
      let totalKgSueltosTajado = 0;

      for (const item of dcItems) {
        if (item.ventaTipo === 'BLOQUES') {
          totalEnteros += item.bloquesEnterosVendidos;
          totalTajados += item.bloquesTajadosVendidos + item.bloquesTajadosDeFabricaVendidos;
        } else {
          // GRANEL — convert kg to blocks within variety
          const kg = Number(item.cantidadKg);
          const variedad = item.origenCorte === 'TAJADO' ? 'tajado' : 'entero';
          if (variedad === 'entero') {
            totalKgSueltosEntero += kg;
          } else {
            totalKgSueltosTajado += kg;
          }
        }
      }

      return formatDobleCremaDetalle(totalEnteros, totalTajados, totalKgSueltosEntero, totalKgSueltosTajado);
    }

    // Mixed: DC + SS — show both separated by " | "
    let totalEnteros = 0;
    let totalTajados = 0;
    let totalKgSueltosEntero = 0;
    let totalKgSueltosTajado = 0;

    for (const item of dcItems) {
      if (item.ventaTipo === 'BLOQUES') {
        totalEnteros += item.bloquesEnterosVendidos;
        totalTajados += item.bloquesTajadosVendidos + item.bloquesTajadosDeFabricaVendidos;
      } else {
        const kg = Number(item.cantidadKg);
        const variedad = item.origenCorte === 'TAJADO' ? 'tajado' : 'entero';
        if (variedad === 'entero') {
          totalKgSueltosEntero += kg;
        } else {
          totalKgSueltosTajado += kg;
        }
      }
    }

    const dcPart = formatDobleCremaDetalle(totalEnteros, totalTajados, totalKgSueltosEntero, totalKgSueltosTajado);
    const ssKg = ssItems.reduce((sum, item) => sum + Number(item.cantidadKg), 0);
    return `${dcPart} | ${formatSSKg(ssKg)}`;
  }},
  { key: 'ingresoTotal', header: 'Ingreso Total', type: 'currency' as ColumnType, format: (v: unknown) => v != null ? Number(v) : 0 },
  { key: 'abono', header: 'Abono', type: 'currency' as ColumnType, format: (v: unknown) => v != null ? Number(v) : 0 },
  { key: 'saldo', header: 'Saldo Pendiente', type: 'currency' as ColumnType, format: (v: unknown) => v != null ? Number(v) : 0 },
  { key: 'gananciaBruta', header: 'Ganancia Bruta', type: 'currency' as ColumnType, format: (v: unknown) => v != null ? Number(v) : 0 },
  { key: 'valorDomicilio', header: 'Domicilio ($)', type: 'currency' as ColumnType, format: (v: unknown) => v != null ? Number(v) : 0 },
];

interface VentasClientPageProps {
  initialVentas: VentaResponse[];
  clientes: ClienteResponse[];
  lotes: LoteResponse[];
  proveedores: ProveedorResponse[];
  precioBolsa: number;
  initialInicio: string;
  initialFin: string;
  initialMetodoPago?: string;
  initialSaldoPendiente?: boolean;
}

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
  { label: 'Recortes DC', value: TipoProducto.RECORTES_DOBLE_CREMA },
];

const metodoPagoFilterOptions = [
  { label: 'Efectivo', value: 'EFECTIVO' },
  { label: 'Nequi', value: 'NEQUI' },
  { label: 'Bre-B', value: 'BRE_B' },
  { label: 'Crédito', value: 'CREDITO' },
];

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function VentasClientPage({ initialVentas, clientes, lotes, proveedores, precioBolsa, initialInicio, initialFin, initialMetodoPago, initialSaldoPendiente }: VentasClientPageProps) {
  const [ventas, setVentas] = useState<VentaResponse[]>(initialVentas);
  const [clientesState, setClientes] = useState<ClienteResponse[]>(clientes);
  const [inicio, setInicio] = useState(initialInicio);
  const [fin, setFin] = useState(initialFin);
  const [loading, setLoading] = useState(false);
  const [ventaToEdit, setVentaToEdit] = useState<VentaResponse | null>(null);
  const [ventaToAbonar, setVentaToAbonar] = useState<VentaResponse | null>(null);
  const [saldoPendiente, setSaldoPendiente] = useState(initialSaldoPendiente ?? false);

  const clienteMap = useMemo(
    () => new Map(clientesState.map((c) => [c.id, c.nombre])),
    [clientesState]
  );

  const clienteObjMap = useMemo(
    () => new Map(clientesState.map((c) => [c.id, c])),
    [clientesState]
  );

  const clienteFilterOptions = useMemo(
    () => clientesState.filter((c) => !c.deletedAt).map((c) => ({ label: c.nombre, value: c.id })),
    [clientesState]
  );

  const loteProductoMap = useMemo(
    () => new Map(lotes.map((l) => [l.id, l.producto])),
    [lotes]
  );

  const proveedorMap = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores]
  );

  const loteProveedorNombreMap = useMemo(
    () => new Map(lotes.map((l) => [l.id, proveedorMap.get(l.proveedorId) ?? ''])),
    [lotes, proveedores]
  );

  const loteMap = useMemo(
    () => new Map(lotes.map((l) => [l.id, l])),
    [lotes]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      { columnId: 'clienteNombre', label: 'Cliente', options: clienteFilterOptions },
      { columnId: 'metodoPago', label: 'Método de Pago', options: metodoPagoFilterOptions },
      { columnId: 'productos', label: 'Producto', options: productoFilterOptions },
    ],
    [clienteFilterOptions]
  );

  const columns = useMemo(
    () => createVentaColumns(clienteMap, loteProductoMap, loteProveedorNombreMap, (venta) => (
      <VentaDetalleDialog
        venta={venta}
        clienteMap={clienteMap}
        loteProductoMap={loteProductoMap}
        loteProveedorNombreMap={loteProveedorNombreMap}
        loteMap={loteMap}
        clienteObjMap={clienteObjMap}
        onEdit={(v) => setVentaToEdit(v)}
        onAbonar={(v) => setVentaToAbonar(v)}
      />
    ), (venta) => setVentaToAbonar(venta)),
    [clienteMap, loteProductoMap, loteProveedorNombreMap, loteMap, clienteObjMap]
  );

  const filteredVentas = useMemo(() => {
    if (!saldoPendiente) return ventas;
    return ventas.filter((v) => Number(v.saldo) > 0);
  }, [ventas, saldoPendiente]);

  const table = useReactTable({
    data: filteredVentas,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  // Apply initial filter after mount to avoid React state update warning
  useEffect(() => {
    if (initialMetodoPago) {
      table.getColumn('metodoPago')?.setFilterValue(initialMetodoPago);
    }
  }, [initialMetodoPago, table]);

  // Totals derived from the table's filtered rows (respects all active filters)
  const filteredTotals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;
    const visible = rows.map((row) => row.original as VentaResponse);
    const ingreso = visible.reduce((sum, v) => sum + Number(v.ingresoTotal), 0);
    const ganancia = visible.reduce((sum, v) => sum + Number(v.gananciaBruta), 0);
    const saldoTotal = visible.reduce((sum, v) => sum + Number(v.saldo), 0);
    return { ingreso, ganancia, saldoTotal, count: visible.length };
  }, [table.getFilteredRowModel().rows]);

  // Dynamic footer label based on active filters
  const metodoPagoFilter = String(table.getColumn('metodoPago')?.getFilterValue() ?? '');
  const isCredito = metodoPagoFilter.includes('CREDITO');
  const isEfectivo = metodoPagoFilter === 'EFECTIVO';
  const isNequi = metodoPagoFilter === 'NEQUI';
  const isBreb = metodoPagoFilter === 'BRE_B';
  const isDigital = isNequi || isBreb;

  const footerLabel = useMemo(() => {
    if (saldoPendiente && isCredito) return `ventas con deuda`;
    if (isCredito) return 'ventas a crédito';
    if (isEfectivo) return 'ventas en efectivo';
    if (isNequi) return 'ventas por Nequi';
    if (isBreb) return 'ventas por Bre-B';
    if (isDigital) return 'ventas digitales';
    return 'ventas';
  }, [metodoPagoFilter, saldoPendiente]);

  const showFooter = filteredTotals.count > 0;
  const showSaldo = isCredito || saldoPendiente;

  const { exportExcel, isExporting, getPreviewData } = useExportExcel(table, ventaExportMap, 'Ventas');
  const { isGenerating: isGeneratingPdf, fetchPdf } = usePdfDownload();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ columnMap: ColumnMapItem[]; data: unknown[][]; entityName: string } | null>(null);

  const handlePreviewExport = useCallback(() => {
    const data = getPreviewData();
    setPreviewData(data);
    setPreviewOpen(true);
  }, [getPreviewData]) as () => Promise<void>;

  const handlePdfVentas = () => {
    fetchPdf(`/api/reports/ventas?inicio=${inicio}&fin=${fin}`);
  };

  const handleDateRangeChange = useCallback(async (newInicio: string, newFin: string) => {
    setInicio(newInicio);
    setFin(newFin);
    setLoading(true);

    // Sync URL with new date range
    const params = new URLSearchParams();
    params.set('inicio', newInicio);
    params.set('fin', newFin);
    if (saldoPendiente) params.set('saldo', 'PENDIENTE');
    window.history.replaceState(null, '', `/ventas?${params.toString()}`);

    try {
      const result = await getVentasByExactDateRange(newInicio, newFin);
      if (result.success && result.ventas) {
        setVentas(result.ventas);
      }
    } finally {
      setLoading(false);
    }
  }, [saldoPendiente]);

  const handleSaldoPendienteChange = useCallback((checked: boolean) => {
    setSaldoPendiente(checked);
    const params = new URLSearchParams();
    params.set('inicio', inicio);
    params.set('fin', fin);
    if (checked) params.set('saldo', 'PENDIENTE');
    window.history.replaceState(null, '', `/ventas?${params.toString()}`);
  }, [inicio, fin]);

  const refreshData = useCallback(async () => {
    const [ventasResult, clientesResult] = await Promise.all([
      getVentasByExactDateRange(inicio, fin),
      getClientesIncludeDeleted(),
    ]);
    if (ventasResult.success && ventasResult.ventas) {
      setVentas(ventasResult.ventas);
    }
    if (clientesResult.success && clientesResult.clientes) {
      setClientes(clientesResult.clientes);
    }
  }, [inicio, fin]);

  const periodLabel = `${formatDisplayDate(inicio)} — ${formatDisplayDate(fin)}`;

  return (
    <RefreshContext.Provider value={refreshData}>
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Registro de ventas — {periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            inicio={inicio}
            fin={fin}
            onDateRangeChange={handleDateRangeChange}
          />
          <RegistrarVentaDialog clientes={clientesState} lotes={lotes} proveedorMap={proveedorMap} ventaToEdit={ventaToEdit} onEditComplete={() => setVentaToEdit(null)} precioBolsa={precioBolsa} />
          {ventaToAbonar && (
            <AbonoPagoDialog
              ventaId={ventaToAbonar.id}
              ingresoTotal={ventaToAbonar.ingresoTotal}
              abonoActual={ventaToAbonar.abono}
              clienteNombre={ventaToAbonar.clienteNombre}
              open={true}
              onClose={() => setVentaToAbonar(null)}
            />
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <DeferredMount>
          {ventas.length === 0 && !loading ? (
            <p className="text-muted-foreground text-center py-8">No hay ventas en el período seleccionado</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar ventas..."
                filters={filters}
                pdfButtons={[
                  { label: 'Reporte Ventas', onClick: handlePdfVentas, loading: isGeneratingPdf },
                ]}
                onExportExcel={handlePreviewExport}
                isExporting={isExporting}
                saldoPendiente={saldoPendiente}
                onSaldoPendienteChange={handleSaldoPendienteChange}
              />
              <DataTable
                table={table}
                isLoading={loading}
                emptyMessage="No hay ventas en este período"
                footerRow={
                  showFooter ? (
                    <tr className="border-t-2 bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={5}>Total ({filteredTotals.count} {footerLabel})</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-xs text-muted-foreground">Ingreso: </span>${Math.round(filteredTotals.ingreso).toLocaleString('es-AR')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-xs text-muted-foreground">Ganancia: </span>
                        <span className={filteredTotals.ganancia < 0 ? 'text-red-600' : 'text-green-600'}>
                          ${Math.round(filteredTotals.ganancia).toLocaleString('es-AR')}
                        </span>
                      </td>
                      {showSaldo ? (
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">
                          <span className="text-xs text-muted-foreground">Saldo: </span>${Math.round(filteredTotals.saldoTotal).toLocaleString('es-AR')}
                        </td>
                      ) : null}
                    </tr>
                  ) : undefined
                }
              />
            </>
          )}
          </DeferredMount>
        </CardContent>
      </Card>

      {previewData && (
        <VistaPreviaExcelDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          columnMap={previewData.columnMap}
          data={previewData.data}
          entityName={previewData.entityName}
          onDownload={exportExcel}
        />
      )}
    </div>
    </RefreshContext.Provider>
  );
}