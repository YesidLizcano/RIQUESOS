'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar, FilterConfig } from '@/components/data-table-toolbar';
import { createLoteColumns, AlertaInfo } from '@/components/columns/lote-columns';
import { CrearLoteDialog } from '@/components/forms/crear-lote-dialog';
import { RegistrarTajadoDialog } from '@/components/forms/registrar-tajado-dialog';
import { getLotes, getLotesIncludeDeleted } from '@/presentation/actions/lotes';
import { useExportExcel } from '@/hooks/use-export-excel';
import { RefreshContext } from '@/components/refresh-context';
import type { LoteResponse, ProveedorResponse, AlertaLoteResponse } from '@/presentation/dtos';
import { AlertaSeveridad } from '@/presentation/dtos';
import { TipoProducto, EstadoLote } from '@/domain/enums';

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
  { key: 'cantidadCompradaKg', header: 'Cant. Comprada (Kg)', format: (v: unknown) => Number(v) },
  { key: 'precioCompraBaseKg', header: 'Precio Base/Kg', format: (v: unknown) => Number(v) },
  { key: 'costoRealCalculadoKg', header: 'Costo Real/Kg', format: (v: unknown) => Number(v) },
  { key: 'stockDisponibleKg', header: 'Stock Disp. (Kg)', format: (v: unknown) => Number(v) },
  { key: 'estado', header: 'Estado', format: (v: unknown) => ESTADO_LABELS[v as string] ?? v },
  { key: 'fechaIngreso', header: 'Fecha Ingreso' },
];

interface LotesClientPageProps {
  lotes: LoteResponse[];
  proveedores: ProveedorResponse[];
  alertas: AlertaLoteResponse[];
}

const productoFilterOptions = [
  { label: 'Doble Crema', value: TipoProducto.DOBLE_CREMA },
  { label: 'Semisalado', value: TipoProducto.SEMISALADO },
];

const estadoFilterOptions = [
  { label: 'Activo', value: EstadoLote.ACTIVO },
  { label: 'Agotado', value: EstadoLote.AGOTADO },
];

export function LotesClientPage({ lotes, proveedores, alertas }: LotesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [data, setData] = useState<LoteResponse[]>(lotes);

  // Sync when server data changes (fallback for initial load)
  useEffect(() => {
    setData(lotes);
  }, [lotes]);

  const proveedorMap = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores]
  );

  // Build alertMap from alertas for badge rendering in lote columns
  const alertMap = useMemo(() => {
    const map = new Map<string, AlertaInfo>();
    for (const alerta of alertas) {
      const existing = map.get(alerta.loteId);
      const stockSeverity = (alerta.alertaTipo === 'STOCK_CRITICO' || alerta.alertaTipo === 'STOCK_BAJO')
        ? (alerta.severidad === AlertaSeveridad.CRITICAL ? 'critical' as const : 'warning' as const)
        : existing?.stockSeverity;
      const ageSeverity = (alerta.alertaTipo === 'MUY_ANTIGUO' || alerta.alertaTipo === 'ANTIGUO')
        ? (alerta.severidad === AlertaSeveridad.CRITICAL ? 'critical' as const : 'warning' as const)
        : existing?.ageSeverity;
      map.set(alerta.loteId, {
        stockSeverity,
        ageSeverity,
        diasEnInventario: alerta.diasEnInventario,
      });
    }
    return map;
  }, [alertas]);

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
    () => createLoteColumns(proveedorMap, showDeleted, alertMap),
    [proveedorMap, showDeleted, alertMap]
  );

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    if (checked) {
      const result = await getLotesIncludeDeleted();
      if (result.success && result.lotes) {
        setData(result.lotes);
      }
    } else {
      setData(lotes);
    }
  }, [lotes]);

  const refreshData = useCallback(async () => {
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

  const { exportExcel, isExporting } = useExportExcel(table, loteExportMap, 'Lotes');

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
          <RegistrarTajadoDialog lotes={lotes} />
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
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
                onExportExcel={exportExcel}
                isExporting={isExporting}
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