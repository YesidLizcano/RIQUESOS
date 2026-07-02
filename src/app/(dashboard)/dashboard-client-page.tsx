'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/dashboard-metric-card';
import { PeriodSelector } from '@/components/period-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { getMetricas } from '@/presentation/actions/dashboard';
import type { InventarioPorProductoResponse, TopClienteResponse, DashboardMetricasResponse } from '@/presentation/dtos';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Column definitions for Inventory table
const inventoryColumns: ColumnDef<InventarioPorProductoResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
  },
  {
    accessorKey: 'stockDisponibleKg',
    header: 'Stock (Kg)',
    cell: ({ row }) => Number(row.getValue('stockDisponibleKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'lotesActivos',
    header: 'Lotes Activos',
  },
];

// Column definitions for Top Clients table
const topClientsColumns: ColumnDef<TopClienteResponse, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Cliente',
  },
  {
    accessorKey: 'ingresoTotal',
    header: 'Ingresos',
    cell: ({ row }) => `$${Number(row.getValue('ingresoTotal')).toLocaleString('es-AR')}`,
  },
];

interface DashboardClientPageProps {
  initialMetricas: DashboardMetricasResponse;
  initialMonth: number;
  initialYear: number;
}

export function DashboardClientPage({ initialMetricas, initialMonth, initialYear }: DashboardClientPageProps) {
  const [metricas, setMetricas] = useState<DashboardMetricasResponse>(initialMetricas);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);

  const handlePeriodChange = async (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setLoading(true);

    try {
      const result = await getMetricas(newMonth, newYear);
      if (result.success && result.metricas) {
        setMetricas(result.metricas);
      }
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = `${MESES[month]} ${year}`;
  const p = metricas.periodo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de métricas del negocio</p>
        </div>
        <PeriodSelector
          month={month}
          year={year}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Actualizando métricas...</p>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Ingresos"
          value={`$${Number(p.ingresoTotal).toLocaleString('es-AR')}`}
          description={`ventas en ${periodLabel}`}
        />
        <MetricCard
          title="Costo Mercancía"
          value={`$${Number(p.costoMercancia).toLocaleString('es-AR')}`}
          description="costo de mercancía vendida"
        />
        <MetricCard
          title="Ganancia Bruta"
          value={`$${Number(p.gananciaBruta).toLocaleString('es-AR')}`}
          description={p.margenBrutoPct !== 'N/A' ? `margen bruto ${p.margenBrutoPct}%` : 'margen bruto'}
        />
        <MetricCard
          title="Gastos Fijos"
          value={`$${Number(p.gastosFijos).toLocaleString('es-AR')}`}
          description="gastos fijos del período"
        />
        <MetricCard
          title="Ganancia Neta"
          value={`$${Number(p.gananciaNeta).toLocaleString('es-AR')}`}
          variant={Number(p.gananciaNeta) < 0 ? 'destructive' : 'success'}
          description={p.margenNetoPct !== 'N/A' ? `margen neto ${p.margenNetoPct}%` : 'margen neto'}
        />
      </div>

      {/* Sales & Inventory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Inventario Valor"
          value={`$${Number(metricas.inventarioResumen.valorTotal).toLocaleString('es-AR')}`}
          description="valor de stock activo"
        />
        <MetricCard
          title="Ventas"
          value={String(p.ventasCount)}
          description={`ventas en ${MESES[month]}`}
        />
        <MetricCard
          title="Clientes Activos"
          value={String(p.clientesActivos)}
          description="clientes con compras"
        />
        <MetricCard
          title="Kg Vendidos"
          value={Number(p.kgVendidos).toLocaleString('es-AR')}
          description={`kg vendidos en ${MESES[month]}`}
        />
        <MetricCard
          title="Lotes Activos"
          value={String(metricas.inventarioResumen.lotesActivos)}
          description="lotes en stock"
        />
      </div>

      {/* Inventory and Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventario por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.inventario.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay inventario activo</p>
            ) : (
              <DataTable columns={inventoryColumns} data={metricas.inventario} pagination={false} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.topClientes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay ventas en el período</p>
            ) : (
              <DataTable columns={topClientsColumns} data={metricas.topClientes} pagination={false} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}