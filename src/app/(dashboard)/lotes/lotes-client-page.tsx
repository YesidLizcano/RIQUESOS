'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createLoteColumns } from '@/components/columns/lote-columns';
import { CrearLoteDialog } from '@/components/forms/crear-lote-dialog';
import { RegistrarTajadoDialog } from '@/components/forms/registrar-tajado-dialog';
import { PagarLoteDialog } from '@/components/forms/pagar-lote-dialog';
import { CerrarLoteDialog } from '@/components/forms/cerrar-lote-dialog';
import { getLotes, getLotesIncludeDeleted } from '@/presentation/actions/lotes';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { ColumnType, ColumnMapItem } from '@/hooks/use-export-excel';
import { VistaPreviaExcelDialog } from '@/components/dialogs/vista-previa-excel-dialog';
import { RefreshContext } from '@/components/refresh-context';
import { DeferredMount } from '@/components/deferred-mount';
import type { LoteResponse, ProveedorResponse } from '@/presentation/dtos';
import { TipoProducto, EstadoLote } from '@/domain/enums';
import { isDobleCrema, formatDobleCremaDetalle } from '@/domain/constants';

const ESTADO_LABELS: Record<string, string> = {
  ACTIVO: 'Activo',
  AGOTADO: 'Agotado',
};

const PRODUCTO_LABELS: Record<string, string> = {
  DOBLE_CREMA: 'Doble Crema',
  SEMISALADO: 'Semisalado',
};

const loteExportMap = [
  { key: 'producto', header: 'Producto', format: (v: unknown) => PRODUCTO_LABELS[v as string] ?? v },
  { key: 'proveedorNombre', header: 'Proveedor' },
  { key: 'cantidadCompradaKg', header: 'Cant. Comprada', type: 'decimal' as ColumnType, format: (_v: unknown, row: unknown) => {
    const lote = row as LoteResponse;
    if (isDobleCrema(lote.producto)) {
      return formatDobleCremaDetalle(
        lote.bloquesEnterosOriginal,
        lote.bloquesTajadosFabricaOriginal,
        0, // purchased lotes have no loose kg at purchase time
        0,
      );
    }
    return Number(lote.cantidadCompradaKg);
  }},
  { key: 'precioCompraBaseKg', header: 'Precio Base/Kg', type: 'currency' as ColumnType, noSum: true },
  { key: 'costoRealCalculadoKg', header: 'Costo Real/Bloque', type: 'text' as ColumnType, noSum: true, format: (_v: unknown, row: unknown) => {
    const lote = row as LoteResponse;
    if (isDobleCrema(lote.producto)) {
      const costoEntero = Math.round(Number(lote.costoRealCalculadoKg) * 2.5);
      const costoTajadoKg = Number(lote.costoTajadoKg) || Number(lote.costoRealCalculadoKg);
      const costoTajadoFabricaKg = Number(lote.costoTajadoFabricaKg) || Number(lote.costoRealCalculadoKg);
      const costoTajado = Math.round(Math.max(costoTajadoKg, costoTajadoFabricaKg) * 2.5);
      return `$${costoEntero.toLocaleString('es-AR')}/E  |  $${costoTajado.toLocaleString('es-AR')}/T`;
    }
    return `$${Math.round(Number(lote.costoRealCalculadoKg)).toLocaleString('es-AR')}/kg`;
  }},
  { key: 'stockDisponibleKg', header: 'Stock Disponible', type: 'decimal' as ColumnType, format: (_v: unknown, row: unknown) => {
    const lote = row as LoteResponse;
    if (isDobleCrema(lote.producto)) {
      return formatDobleCremaDetalle(
        lote.bloquesEnteros,
        lote.bloquesTajados + lote.bloquesTajadosDeFabrica,
        Number(lote.sueltosEntero),
        Number(lote.sueltosTajado),
      );
    }
    return Number(lote.stockDisponibleKg);
  }},
  { key: 'estado', header: 'Estado', format: (v: unknown) => ESTADO_LABELS[v as string] ?? v },
  { key: 'fechaIngreso', header: 'Fecha Ingreso', type: 'date' as ColumnType },
];

interface LotesClientPageProps {
  lotes: LoteResponse[];
  proveedores: ProveedorResponse[];
  initialEstadoPago?: string;
}

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
];

const estadoFilterOptions = [
  { label: 'Activo', value: EstadoLote.ACTIVO },
  { label: 'Agotado', value: EstadoLote.AGOTADO },
];

const estadoPagoFilterOptions = [
  { label: 'Pendiente', value: 'PENDIENTE' },
  { label: 'Pagado', value: 'PAGADO' },
];

export function LotesClientPage({ lotes, proveedores, initialEstadoPago }: LotesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LoteResponse[]>(lotes);
  const [loteToPagar, setLoteToPagar] = useState<{ id: string; producto: string; proveedorNombre?: string; estadoPago: string } | null>(null);
  const [loteToCerrar, setLoteToCerrar] = useState<LoteResponse | null>(null);

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
      { columnId: 'estadoPago', label: 'Pago', options: estadoPagoFilterOptions },
      { columnId: 'proveedorNombre', label: 'Proveedor', options: proveedorFilterOptions },
    ],
    [proveedorFilterOptions]
  );

  const columns = useMemo(
    () => createLoteColumns(proveedorMap, showDeleted, (lote) => {
      setLoteToPagar({ id: lote.id, producto: lote.producto, proveedorNombre: lote.proveedorId ? proveedorMap.get(lote.proveedorId) : undefined, estadoPago: lote.estadoPago });
    }, (lote) => {
      setLoteToCerrar(lote);
    }),
    [proveedorMap, showDeleted]
  );

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    setIsLoading(true);
    try {
      if (checked) {
        const result = await getLotesIncludeDeleted();
        if (result.success && result.lotes) {
          setData(result.lotes);
        }
      } else {
        setData(lotes);
      }
    } finally {
      setIsLoading(false);
    }
  }, [lotes]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (showDeleted) {
        const result = await getLotesIncludeDeleted();
        if (result.success && result.lotes) {
          setData(result.lotes);
        }
      } else {
        const result = await getLotes();
        if (result.success && result.lotes) {
          setData(result.lotes);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  // Apply initial filter after mount to avoid React state update warning
  useEffect(() => {
    if (initialEstadoPago) {
      table.getColumn('estadoPago')?.setFilterValue(initialEstadoPago);
    }
  }, [initialEstadoPago, table]);

  // Totals derived from the table's filtered rows (respects all active filters)
  const filteredTotals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;
    const visible = rows.map((row) => row.original as LoteResponse);
    const costoTotal = visible.reduce((sum, l) => sum + Number(l.costoTotalLote), 0);
    const deudaPendiente = visible.reduce((sum, l) => {
      if (l.estadoPago !== 'PENDIENTE') return sum;
      return sum + Number(l.costoTotalLote);
    }, 0);
    return { costoTotal, deudaPendiente, count: visible.length };
  }, [table.getFilteredRowModel().rows]);

  const { exportExcel, isExporting, getPreviewData } = useExportExcel(table, loteExportMap, 'Lotes');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ columnMap: ColumnMapItem[]; data: unknown[][]; entityName: string } | null>(null);

  const handlePreviewExport = useCallback(() => {
    const data = getPreviewData();
    setPreviewData(data);
    setPreviewOpen(true);
  }, [getPreviewData]) as () => Promise<void>;

  return (
    <RefreshContext.Provider value={refreshData}>
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lotes</h1>
          <p className="text-muted-foreground">Gestión de lotes de queso</p>
        </div>
        <CrearLoteDialog proveedores={proveedores} />
        {lotes.some((l) => l.producto === 'DOBLE_CREMA' && l.bloquesEnteros > 0 && l.estado === 'ACTIVO' && !l.deletedAt) && (
          <RegistrarTajadoDialog lotes={lotes} proveedores={proveedores} />
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <DeferredMount>
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay lotes</p>
          ) : (
            <>
              <DataTableToolbar
                table={table}
                searchPlaceholder="Buscar lotes..."
                filters={filters}
                showDeleted={showDeleted}
                onShowDeletedChange={handleShowDeletedChange}
                onExportExcel={handlePreviewExport}
                isExporting={isExporting}
              />
              <DataTable
                table={table}
                isLoading={isLoading}
                emptyMessage="No hay lotes registrados"
                footerRow={
                  filteredTotals.count > 0 ? (
                    <tr className="border-t-2 bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={2}>
                        Total ({filteredTotals.count} lote{filteredTotals.count !== 1 ? 's' : ''})
                      </td>
                      <td className="px-3 py-2 text-right" colSpan={5}>
                        <span className="text-xs text-muted-foreground mr-1">Inversión:</span>
                        ${Math.round(filteredTotals.costoTotal).toLocaleString('es-AR')}
                        <span className="text-xs text-muted-foreground ml-3 mr-1">Deuda:</span>
                        <span className={filteredTotals.deudaPendiente === 0 ? 'text-green-600' : 'text-amber-600'}>
                          ${Math.round(filteredTotals.deudaPendiente).toLocaleString('es-AR')}
                        </span>
                      </td>
                    </tr>
                  ) : undefined
                }
              />
            </>
          )}
          </DeferredMount>
        </CardContent>
      </Card>

      {loteToPagar && (
        <PagarLoteDialog
          loteId={loteToPagar.id}
          producto={loteToPagar.producto}
          proveedorNombre={loteToPagar.proveedorNombre}
          estadoPago={loteToPagar.estadoPago}
          open={!!loteToPagar}
          onOpenChange={(open) => { if (!open) setLoteToPagar(null); }}
          onSuccess={() => refreshData()}
        />
      )}

      {loteToCerrar && (
        <CerrarLoteDialog
          lote={loteToCerrar}
          open={!!loteToCerrar}
          onOpenChange={(open) => { if (!open) setLoteToCerrar(null); }}
        />
      )}

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