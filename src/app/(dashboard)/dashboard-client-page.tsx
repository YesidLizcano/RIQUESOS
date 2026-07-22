'use client';

import { useState, useCallback } from 'react';
import { MetricCard } from '@/components/dashboard-metric-card';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { ProductoBadge } from '@/components/producto-badge';
import { ColumnDef } from '@tanstack/react-table';
import { Download, Loader2, Banknote, CreditCard, Wallet, FileText, Scissors } from 'lucide-react';
import { CuentasPorPagarDialog } from '@/components/cuentas-por-pagar-dialog';
import { getMetricas } from '@/presentation/actions/dashboard';
import { getVentasByExactDateRange } from '@/presentation/actions/ventas';
import { usePdfDownload } from '@/hooks/use-pdf-download';
import { RefreshContext } from '@/components/refresh-context';
import { exportDashboardExcel, getDashboardPreviewData } from '@/hooks/export-dashboard';
import type { DashboardPreviewData } from '@/hooks/export-dashboard';
import { VistaPreviaDashboardDialog } from '@/components/dialogs/vista-previa-dashboard-dialog';
import type { TopClienteResponse, DashboardMetricasResponse, DesglosePorProductoResponse, DesglosePorProveedorResponse } from '@/presentation/dtos';
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Tooltip,
} from 'recharts';
import { useRouter } from 'next/navigation';

import { formatCurrency, formatSSKg } from '@/domain/formatters';
import { formatDobleCremaDetalle } from '@/domain/constants';

// --- Shared formatters for inventory & volume display ---

/** Format DC volume from periodo DTO fields (enteros/tajados already include granel conversions, residuos are < 2.5 kg) */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// --- Chart color palettes ---
const DAILY_SALES_CONFIG: ChartConfig = {
  total: { label: 'Ventas diarias', theme: { light: '#3b82f6', dark: '#60a5fa' } },
};

const INVENTARIO_TIPO_CONFIG: ChartConfig = {
  DOBLE_CREMA: { label: 'Doble Crema', theme: { light: '#8b5cf6', dark: '#a78bfa' } },
  SEMISALADO: { label: 'Semisalado', theme: { light: '#f59e0b', dark: '#fbbf24' } },
};

// --- Empty state component ---
function EmptyChartState() {
  return (
    <p className="text-muted-foreground text-center py-8">Sin datos para este período</p>
  );
}

// --- Custom tooltip for Inventario por Tipo donut ---
interface InventarioTipoTooltipPayload {
  tipo: string;
  stock: number;
  bloquesEnteros: number;
  bloquesTajados: number;
  sueltosEntero: number;
  sueltosTajado: number;
}

function InventarioTipoTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: InventarioTipoTooltipPayload }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const isDC = data.tipo === 'DOBLE_CREMA';
  const formatted = isDC
    ? `Doble Crema: ${formatDobleCremaDetalle(data.bloquesEnteros, data.bloquesTajados, data.sueltosEntero, data.sueltosTajado)}`
    : `Semisalado: ${formatSSKg(data.stock)}`;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      {formatted}
    </div>
  );
}

// --- Chart config for Top Clientes ---
const TOP_CLIENTES_CONFIG: ChartConfig = {
  ingreso: { label: 'Ingreso', theme: { light: '#3b82f6', dark: '#60a5fa' } },
};

// --- Custom tooltip for Top Clientes bar chart ---
interface TopClienteTooltipPayload {
  nombre: string;
  ingreso: number;
  tipo: string;
  dcBloques: number;
  ssKg: number;
}

function TopClienteTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TopClienteTooltipPayload }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const volumeParts: string[] = [];
  if (data.dcBloques > 0) volumeParts.push(`${data.dcBloques} bloques DC`);
  if (data.ssKg > 0) volumeParts.push(`${Math.round(data.ssKg * 10) / 10} kg SS`);
  const volumeStr = volumeParts.length > 0 ? volumeParts.join(' • ') : 'Sin volumen';
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{data.nombre}</p>
      <p className="text-muted-foreground">${Math.round(data.ingreso).toLocaleString('es-AR')}</p>
      <p className="text-muted-foreground text-xs">{volumeStr}</p>
    </div>
  );
}

/** Build chart data: mayoristas individually, minoristas grouped */
function buildTopClientesData(clientes: TopClienteResponse[]) {
  const items: Array<{ nombre: string; ingreso: number; tipo: string; dcBloques: number; ssKg: number }> = [];

  // Mayoristas as individual bars
  const mayoristas = clientes.filter((c) => c.tipo === 'MAYORISTA');
  for (const m of mayoristas) {
    items.push({
      nombre: m.nombre,
      ingreso: Number(m.ingresoTotal),
      tipo: m.tipo,
      dcBloques: m.dcBloques,
      ssKg: m.ssKg,
    });
  }

  // Minoristas grouped into one bar
  const minoristas = clientes.filter((c) => c.tipo === 'MINORISTA');
  if (minoristas.length > 0) {
    const totalIngreso = minoristas.reduce((sum, c) => sum + Number(c.ingresoTotal), 0);
    const totalDcBloques = minoristas.reduce((sum, c) => sum + c.dcBloques, 0);
    const totalSsKg = minoristas.reduce((sum, c) => sum + c.ssKg, 0);
    items.push({
      nombre: `Minoristas (${minoristas.length})`,
      ingreso: totalIngreso,
      tipo: 'MINORISTA',
      dcBloques: totalDcBloques,
      ssKg: totalSsKg,
    });
  }

  // Sort by revenue descending
  items.sort((a, b) => b.ingreso - a.ingreso);
  return items;
}

// Column definitions for Desglose por Producto table
const desgloseProductoColumns: ColumnDef<DesglosePorProductoResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
    cell: ({ row }) => <ProductoBadge producto={row.getValue('producto') as string} />,
  },
  {
    accessorKey: 'ingreso',
    header: 'Ingreso',
    cell: ({ row }) => `$${Number(row.getValue('ingreso')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'costoAplicado',
    header: 'Costo',
    cell: ({ row }) => `$${Number(row.getValue('costoAplicado')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'gananciaBruta',
    header: 'Ganancia Bruta',
    cell: ({ row }) => `$${Number(row.getValue('gananciaBruta')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'kgVendidos',
    header: 'Volumen',
    cell: ({ row }) => {
      const data = row.original;
      if (data.producto === 'DOBLE_CREMA') {
        const dcEnteros = data.dcEnteros;
        const dcTajados = data.dcTajados;
        const kgGranelEntero = Number(data.dcKgGranelEntero) || 0;
        const kgGranelTajado = Number(data.dcKgGranelTajado) || 0;
        return formatDobleCremaDetalle(dcEnteros, dcTajados, kgGranelEntero, kgGranelTajado);
      }
      return `${Number(data.kgVendidos).toLocaleString('es-AR')} kg`;
    },
  },
  {
    accessorKey: 'ventasCount',
    header: 'Ventas',
  },
];

// Column definitions for Desglose por Proveedor table
const desgloseProveedorColumns: ColumnDef<DesglosePorProveedorResponse, unknown>[] = [
  {
    accessorKey: 'proveedorNombre',
    header: 'Proveedor',
  },
  {
    accessorKey: 'ingreso',
    header: 'Ingreso',
    cell: ({ row }) => `$${Number(row.getValue('ingreso')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'costoAplicado',
    header: 'Costo',
    cell: ({ row }) => `$${Number(row.getValue('costoAplicado')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'gananciaBruta',
    header: 'Ganancia Bruta',
    cell: ({ row }) => `$${Number(row.getValue('gananciaBruta')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'kgVendidos',
    header: 'Volumen',
    cell: ({ row }) => {
      const data = row.original;
      const dcEnteros = data.dcEnteros;
      const dcTajados = data.dcTajados;
      const kgGranelEntero = Number(data.dcKgGranelEntero) || 0;
      const kgGranelTajado = Number(data.dcKgGranelTajado) || 0;
      if (dcEnteros > 0 || dcTajados > 0 || kgGranelEntero > 0 || kgGranelTajado > 0) {
        return formatDobleCremaDetalle(dcEnteros, dcTajados, kgGranelEntero, kgGranelTajado);
      }
      return `${Number(data.kgVendidos).toLocaleString('es-AR')} kg`;
    },
  },
  {
    accessorKey: 'ventasCount',
    header: 'Ventas',
  },
];

interface DashboardClientPageProps {
  initialMetricas: DashboardMetricasResponse;
  initialInicio: string;
  initialFin: string;
}

export function DashboardClientPage({ initialMetricas, initialInicio, initialFin }: DashboardClientPageProps) {
  const [metricas, setMetricas] = useState<DashboardMetricasResponse>(initialMetricas);
  const [inicio, setInicio] = useState(initialInicio);
  const [fin, setFin] = useState(initialFin);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DashboardPreviewData | null>(null);
  const [cxpDialogOpen, setCxpDialogOpen] = useState(false);
  const { isGenerating: isGeneratingPdf, fetchPdf } = usePdfDownload();
  const router = useRouter();

  const refreshData = useCallback(async () => {
    const result = await getMetricas(inicio, fin);
    if (result.success && result.metricas) {
      setMetricas(result.metricas);
    }
  }, [inicio, fin]);

  const handleExportDashboard = async () => {
    setIsExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const ventasResult = await getVentasByExactDateRange(inicio, fin);
      const ventas = ventasResult.success ? ventasResult.ventas : undefined;
      await exportDashboardExcel(metricas, `Dashboard_${today}.xlsx`, ventas);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewDashboard = async () => {
    const ventasResult = await getVentasByExactDateRange(inicio, fin);
    const ventas = ventasResult.success ? ventasResult.ventas : undefined;
    const data = getDashboardPreviewData(metricas, ventas);
    setPreviewData(data);
    setPreviewOpen(true);
  };

  const handlePdfResultados = () => {
    fetchPdf(`/api/reports/resultados?inicio=${inicio}&fin=${fin}`);
  };


  const handleDateRangeChange = async (newInicio: string, newFin: string) => {
    setInicio(newInicio);
    setFin(newFin);
    setLoading(true);

    try {
      const result = await getMetricas(newInicio, newFin);
      if (result.success && result.metricas) {
        setMetricas(result.metricas);
      }
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = `${inicio} — ${fin}`;
  const p = metricas.periodo;

  // --- Chart data preparation ---

  // Daily sales data
  const dailySalesData = metricas.ventasDiarias.map((vd) => ({
    fecha: vd.fecha,
    total: Number(vd.total),
  }));

  // Inventory type donut data
  const inventarioTipoData = metricas.inventarioPorTipo.map((it) => ({
    tipo: it.tipo,
    stock: Number(it.stockKg),
    fill: it.tipo === 'DOBLE_CREMA' ? 'var(--color-DOBLE_CREMA)' : 'var(--color-SEMISALADO)',
    bloquesEnteros: it.bloquesEnteros,
    bloquesTajados: it.bloquesTajados + it.bloquesTajadosDeFabrica,
    sueltosEntero: Number(it.sueltosEntero),
    sueltosTajado: Number(it.sueltosTajado),
  }));

  const hasDailyData = dailySalesData.length > 0;
  const hasInventarioTipoData = inventarioTipoData.length > 0;

  return (
    <RefreshContext.Provider value={refreshData}>
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de métricas del negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            inicio={inicio}
            fin={fin}
            onDateRangeChange={handleDateRangeChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdfResultados}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Resultados PDF
          </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={handlePreviewDashboard}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Row 1 — Liquidez */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Liquidez</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Efectivo"
            value={`$${Number(metricas.flujoDinero.efectivo).toLocaleString('es-AR')}`}
            description="cobros en efectivo"
            icon={<Banknote className="size-4 text-green-600" />}
            onClick={() => router.push(`/ventas?metodoPago=EFECTIVO&inicio=${inicio}&fin=${fin}`)}
          />
          <MetricCard
            title="Bancos / Nequi / Bre-B"
            value={`$${Number(metricas.flujoDinero.bancos).toLocaleString('es-AR')}`}
            description="transferencias y pagos digitales"
            icon={<CreditCard className="size-4 text-blue-600" />}
            onClick={() => router.push(`/ventas?metodoPago=NEQUI,BRE_B&inicio=${inicio}&fin=${fin}`)}
          />
          <MetricCard
            title="Cuentas por Cobrar"
            value={`$${Number(metricas.flujoDinero.cuentasPorCobrar).toLocaleString('es-AR')}`}
            description="crédito pendiente de cobro"
            variant={Number(metricas.flujoDinero.cuentasPorCobrar) > 0 ? 'warning' : 'default'}
            icon={<Wallet className="size-4 text-amber-600" />}
            onClick={() => router.push(`/ventas?metodoPago=CREDITO&saldo=PENDIENTE&inicio=${inicio}&fin=${fin}`)}
          />
          <MetricCard
            title="Cuentas por Pagar"
            value={`$${Number(metricas.cuentasPorPagar.totalPendiente).toLocaleString('es-AR')}`}
            description={`${metricas.cuentasPorPagar.cantidadLotes} lote(s) pendiente(s)`}
            variant={Number(metricas.cuentasPorPagar.totalPendiente) > 0 ? 'warning' : 'default'}
            onClick={() => setCxpDialogOpen(true)}
          />
          <MetricCard
            title="Cuentas por Pagar (Tajados)"
            value={`$${Number(metricas.cuentasPorPagar.tajadosPendientesPago).toLocaleString('es-AR')}`}
            description="pagos pendientes a tajadores"
            variant={Number(metricas.cuentasPorPagar.tajadosPendientesPago) > 0 ? 'warning' : 'default'}
            icon={<Scissors className="size-4 text-amber-600" />}
            onClick={() => router.push('/tajados?estado=PENDIENTE')}
          />
        </div>

        {/* Ventas Diarias — full width */}
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
      </div>

      {/* Row 2 — Rentabilidad */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Rentabilidad</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            title="Ganancia"
            value={`$${Number(p.gananciaBruta).toLocaleString('es-AR')}`}
            description={p.margenBrutoPct !== 'N/A' ? `margen bruto ${p.margenBrutoPct}%` : 'margen bruto'}
          />
        </div>
      </div>

      {/* Row 3 — Operación */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Operación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <MetricCard
              title="Inventario Valor"
              value={formatCurrency(metricas.inventarioResumen.valorTotal)}
              description="valor de stock activo"
            />
            <MetricCard
              title="Volumen Vendido"
              value={
                <>
                  <span className="block text-lg">
                    Doble Crema: {formatDobleCremaDetalle(p.volumenDobleCremaEnteros, p.volumenDobleCremaTajados, Number(p.volumenDobleCremaKgGranelEntero), Number(p.volumenDobleCremaKgGranelTajado))}
                  </span>
                  <span className="block text-lg">
                    Semisalado: {formatSSKg(Number(p.volumenSemisaladoKg))}
                  </span>
                  {Number(p.volumenRecortesKg) > 0 && (
                    <span className="block text-lg">
                      Recortes: {Number(p.volumenRecortesKg).toLocaleString('es-AR')} kg
                    </span>
                  )}
                </>
              }
            />
            <MetricCard
              title="Lotes Activos"
              value={String(metricas.inventarioResumen.lotesActivos)}
              description="lotes en stock"
            />
          </div>

          {/* Inventario por Tipo donut */}
          <Card>
            <CardHeader>
              <CardTitle>Inventario por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasInventarioTipoData ? (
                <EmptyChartState />
              ) : (
                <ChartContainer config={INVENTARIO_TIPO_CONFIG} className="mx-auto h-[280px] max-w-[360px]">
                  <PieChart>
                    <ChartTooltip content={<InventarioTipoTooltip />} />
                    <Pie
                      data={inventarioTipoData}
                      dataKey="stock"
                      nameKey="tipo"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {inventarioTipoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="tipo" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
            {hasInventarioTipoData && (
              <CardFooter className="flex flex-col gap-1 text-sm">
                {metricas.inventarioPorTipo.map((it) => {
                  const isDC = it.tipo === 'DOBLE_CREMA';
                   const bloquesTajados = it.bloquesTajados + it.bloquesTajadosDeFabrica;
                    const sueltosEntero = Number(it.sueltosEntero);
                    const sueltosTajado = Number(it.sueltosTajado);
                    const detail = isDC
                       ? formatDobleCremaDetalle(it.bloquesEnteros, bloquesTajados, sueltosEntero, sueltosTajado)
                       : formatSSKg(Number(it.stockKg));
                   const lotesDisplay = `${it.lotes} ${it.lotes === 1 ? 'lote' : 'lotes'}`;
                   return (
                     <div key={it.tipo} className="flex items-center justify-between w-full">
                       <span>{isDC ? 'Doble Crema' : 'Semisalado'}</span>
                      <span className="font-medium">
                        {detail} · {lotesDisplay}
                      </span>
                    </div>
                  );
                })}
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Row 4 — Detalle */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Detalle</h2>

        {/* Top Clientes Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.topClientes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay ventas en el período</p>
            ) : (
              <ChartContainer config={TOP_CLIENTES_CONFIG} className="h-[250px] w-full">
                <BarChart
                  data={buildTopClientesData(metricas.topClientes)}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 13 }} />
                  <Tooltip content={<TopClienteTooltip />} />
                  <Bar dataKey="ingreso" fill="var(--color-ingreso)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Desglose por Producto */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.desglosePorProducto.length === 0 ? (
              <EmptyChartState />
            ) : (
              <DataTable columns={desgloseProductoColumns} data={metricas.desglosePorProducto} pagination={false} isLoading={loading} />
            )}
          </CardContent>
        </Card>

        {/* Desglose por Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.desglosePorProveedor.length === 0 ? (
              <EmptyChartState />
            ) : (
              <DataTable columns={desgloseProveedorColumns} data={metricas.desglosePorProveedor} pagination={false} isLoading={loading} />
            )}
          </CardContent>
        </Card>
      </div>

      <CuentasPorPagarDialog
        open={cxpDialogOpen}
        onOpenChange={setCxpDialogOpen}
      />

      <VistaPreviaDashboardDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        previewData={previewData}
        onDownload={handleExportDashboard}
        isExporting={isExporting}
      />
    </div>

    </RefreshContext.Provider>
  );
}