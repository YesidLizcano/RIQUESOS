'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { createEmpaqueColumns } from '@/components/columns/empaque-columns';
import { CrearEmpaqueDialog } from '@/components/forms/crear-empaque-dialog';
import { getEmpaques, getEmpaquesIncludeDeleted } from '@/presentation/actions/empaques';
import { getComprasInsumo } from '@/presentation/actions/compra-insumo';
import { useExportExcel } from '@/hooks/use-export-excel';
import type { ColumnType } from '@/hooks/use-export-excel';
import { RefreshContext } from '@/components/refresh-context';
import { DeferredMount } from '@/components/deferred-mount';
import type { EmpaqueResponse } from '@/presentation/dtos';
import type { CompraInsumoResponse } from '@/presentation/dtos/compra-insumo.dto';
import { categoriaInsumoLabel } from '@/domain/labels';

const empaqueExportMap = [
  { key: 'tipo', header: 'Tipo' },
  { key: 'categoria', header: 'Categoría', format: (v: unknown) => categoriaInsumoLabel[v as keyof typeof categoriaInsumoLabel] ?? v },
  { key: 'stock', header: 'Stock', type: 'decimal' as ColumnType },
  { key: 'precio', header: 'Precio Unitario', type: 'currency' as ColumnType },
];

interface EmpaquesClientPageProps {
  empaques: EmpaqueResponse[];
}

export function EmpaquesClientPage({ empaques }: EmpaquesClientPageProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<EmpaqueResponse[]>(empaques);
  const [compras, setCompras] = useState<CompraInsumoResponse[]>([]);

  useEffect(() => {
    getComprasInsumo().then((result) => {
      if (result.success && result.compras) {
        setCompras(result.compras);
      }
    });
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (showDeleted) {
        const result = await getEmpaquesIncludeDeleted();
        if (result.success && result.empaques) {
          setData(result.empaques);
        }
      } else {
        const result = await getEmpaques();
        if (result.success && result.empaques) {
          setData(result.empaques);
        }
      }
      const comprasResult = await getComprasInsumo();
      if (comprasResult.success && comprasResult.compras) {
        setCompras(comprasResult.compras);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted]);

  const handleShowDeletedChange = useCallback(async (checked: boolean) => {
    setShowDeleted(checked);
    setIsLoading(true);
    try {
      if (checked) {
        const result = await getEmpaquesIncludeDeleted();
        if (result.success && result.empaques) {
          setData(result.empaques);
        }
      } else {
        const result = await getEmpaques();
        if (result.success && result.empaques) {
          setData(result.empaques);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const columns = createEmpaqueColumns(showDeleted);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  const { exportExcel, isExporting } = useExportExcel(table, empaqueExportMap, 'Insumos');

  return (
    <RefreshContext.Provider value={refreshData}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Insumos</h1>
            <p className="text-muted-foreground">Gestión de inventario de insumos</p>
          </div>
          <CrearEmpaqueDialog />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <DeferredMount>
            {data.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay insumos registrados</p>
            ) : (
              <>
                <DataTableToolbar
                  table={table}
                  searchPlaceholder="Buscar insumos..."
                  showDeleted={showDeleted}
                  onShowDeletedChange={handleShowDeletedChange}
                  onExportExcel={exportExcel}
                  isExporting={isExporting}
                />
                <DataTable table={table} isLoading={isLoading} emptyMessage="No hay insumos registrados" />
                <div className="flex items-center gap-6 pt-2 text-sm font-medium">
                  {(() => {
                    const bolsas = data.filter(e => e.categoria === 'BOLSA' && !e.deletedAt);
                    const separadores = data.filter(e => e.categoria === 'SEPARADOR' && !e.deletedAt);
                    const totalBolsas = bolsas.reduce((sum, e) => sum + Math.round(Number(e.stock)), 0);
                    const totalKgSeparadores = separadores.reduce((sum, e) => sum + Number(e.stock), 0);
                    return (
                      <>
                        <span>Bolsas: <strong>{totalBolsas}</strong></span>
                        <span>Separadores: <strong>{totalKgSeparadores.toLocaleString('es-AR')} kg</strong></span>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
            </DeferredMount>
          </CardContent>
        </Card>

        {compras.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Historial de Compras</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Insumo</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Cantidad</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Precio Unit.</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Restante</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.slice(0, 10).map((compra) => (
                      <tr key={compra.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3">
                          {new Date(compra.fecha).toLocaleDateString('es-AR')}
                        </td>
                        <td className="py-2 px-3">{compra.empaqueTipo ?? '—'}</td>
                        <td className="py-2 px-3">
                          {categoriaInsumoLabel[compra.categoria as keyof typeof categoriaInsumoLabel] ?? compra.categoria}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {compra.categoria === 'SEPARADOR'
                            ? `${Number(compra.cantidad).toLocaleString('es-AR')} kg`
                            : Math.round(Number(compra.cantidad))}
                        </td>
                        <td className="py-2 px-3 text-right">
                          ${Number(compra.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {compra.categoria === 'SEPARADOR'
                            ? `${Number(compra.cantidadRestante).toLocaleString('es-AR')} kg`
                            : Math.round(Number(compra.cantidadRestante))}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          ${Number(compra.costoTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RefreshContext.Provider>
  );
}