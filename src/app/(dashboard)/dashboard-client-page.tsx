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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// --- Currency formatter ---
function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// --- Chart color palettes ---
// Revenue composition colors (used for Pie/Bar fills and legend)
const REVENUE_COLORS = {
  costoMercancia: { light: '#ef4444', dark: '#f87171' },
  gastosFijos: { light: '#f59e0b', dark: '#fbbf24' },
  gananciaNeta: { light: '#3b82f6', dark: '#60a5fa' },
} as const;

const DAILY_SALES_CONFIG: ChartConfig = {
  total: { label: 'Ventas diarias', theme: { light: '#3b82f6', dark: '#60a5fa' } },
};

const TOP_CLIENTS_CONFIG: ChartConfig = {
  ingresoTotal: { label: 'Ingresos', theme: { light: '#8b5cf6', dark: '#a78bfa' } },
};

const INVENTORY_CONFIG: ChartConfig = {
  DOBLE_CREMA: { label: 'Doble Crema', theme: { light: '#3b82f6', dark: '#60a5fa' } },
  SEMISALADO: { label: 'Semisalado', theme: { light: '#22c55e', dark: '#4ade80' } },
};

const CLIENT_TYPE_CONFIG: ChartConfig = {
  MAYORISTA: { label: 'Mayorista', theme: { light: '#8b5cf6', dark: '#a78bfa' } },
  MINORISTA: { label: 'Minorista', theme: { light: '#f59e0b', dark: '#fbbf24' } },
};

// --- Empty state component ---
function EmptyChartState() {
  return (
    <p className="text-muted-foreground text-center py-8">Sin datos para este período</p>
  );
}

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

  // --- Chart data preparation ---

  // Revenue composition data
  const revenueCompositionData = [
    { name: 'Costo de mercadería', value: Number(p.costoMercancia), fill: 'var(--color-costoMercancia)' },
    { name: 'Gastos fijos', value: Number(p.gastosFijos), fill: 'var(--color-gastosFijos)' },
    { name: 'Margen', value: Number(p.gananciaNeta), fill: 'var(--color-gananciaNeta)' },
  ];

  const revenueCompositionConfig: ChartConfig = {
    costoMercancia: { label: 'Costo de mercadería', theme: REVENUE_COLORS.costoMercancia },
    gastosFijos: { label: 'Gastos fijos', theme: REVENUE_COLORS.gastosFijos },
    gananciaNeta: { label: 'Margen', theme: REVENUE_COLORS.gananciaNeta },
  };

  // Daily sales data
  const dailySalesData = metricas.ventasDiarias.map((vd) => ({
    fecha: vd.fecha,
    total: Number(vd.total),
  }));

  // Top 5 clients for bar chart (already limited by the use case)
  const topClientsData = metricas.topClientes.map((tc) => ({
    nombre: tc.nombre,
    ingresoTotal: Number(tc.ingresoTotal),
  }));

  // Inventory donut data
  const inventoryData = metricas.inventario.map((item) => ({
    producto: item.producto,
    stockDisponibleKg: Number(item.stockDisponibleKg),
    fill: item.producto === 'DOBLE_CREMA' ? 'var(--color-DOBLE_CREMA)' : 'var(--color-SEMISALADO)',
  }));

  // Client type donut data
  const clientTypeData = metricas.ingresosPorTipoCliente.map((itc) => ({
    tipo: itc.tipo,
    total: Number(itc.total),
    fill: itc.tipo === 'MAYORISTA' ? 'var(--color-MAYORISTA)' : 'var(--color-MINORISTA)',
  }));

  const hasRevenueData = Number(p.ingresoTotal) > 0;
  const hasDailyData = dailySalesData.length > 0;
  const hasTopClients = topClientsData.length > 0;
  const hasInventoryData = inventoryData.length > 0;
  const hasClientTypeData = clientTypeData.length > 0;

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

      {/* Row 1: Revenue Composition (full width) */}
      <Card>
        <CardHeader>
          <CardTitle>Composición de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasRevenueData ? (
            <EmptyChartState />
          ) : (
            <ChartContainer config={revenueCompositionConfig} className="h-[300px] w-full">
              <BarChart data={revenueCompositionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={140} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {revenueCompositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Row 2: Daily Sales Trend (left) + Top Clients Bar (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Diarias</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasDailyData || dailySalesData.every((d) => d.total === 0) ? (
              <EmptyChartState />
            ) : (
              <ChartContainer config={DAILY_SALES_CONFIG} className="h-[300px] w-full">
                <AreaChart data={dailySalesData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatDate(String(label))} formatter={(value) => formatCurrency(Number(value))} />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    fill="var(--color-total)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes por Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTopClients ? (
              <EmptyChartState />
            ) : (
              <ChartContainer config={TOP_CLIENTS_CONFIG} className="h-[300px] w-full">
                <BarChart data={topClientsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="nombre" width={120} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="ingresoTotal" fill="var(--color-ingresoTotal)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Inventory Donut (left) + Client Type Donut (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Inventario por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasInventoryData ? (
              <EmptyChartState />
            ) : (
              <ChartContainer config={INVENTORY_CONFIG} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toLocaleString('es-AR')} Kg`} />} />
                  <Pie
                    data={inventoryData}
                    dataKey="stockDisponibleKg"
                    nameKey="producto"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="producto" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasClientTypeData ? (
              <EmptyChartState />
            ) : (
              <ChartContainer config={CLIENT_TYPE_CONFIG} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Pie
                    data={clientTypeData}
                    dataKey="total"
                    nameKey="tipo"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {clientTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="tipo" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory and Top Clients Tables */}
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