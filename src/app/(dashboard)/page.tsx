import { getMetricas } from '@/presentation/actions/dashboard';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { DashboardClientPage } from './dashboard-client-page';
import { MetricCard } from '@/components/dashboard-metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { LoteResponse } from '@/presentation/dtos';

// Column definitions for Active Lotes table
const lotesColumns: ColumnDef<LoteResponse, unknown>[] = [
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
    accessorKey: 'costoRealCalculadoKg',
    header: 'Costo Real/Kg',
    cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as string;
      return (
        <Badge variant={estado === 'ACTIVO' ? 'default' : 'secondary'}>
          {estado}
        </Badge>
      );
    },
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [metricasResult, lotesResult] = await Promise.all([
    getMetricas(currentMonth, currentYear),
    getLotes(),
  ]);

  const metricas = metricasResult.success ? metricasResult.metricas : null;
  const lotes = lotesResult.success ? lotesResult.lotes : [];

  if (!metricas) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de métricas del negocio</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Error al cargar las métricas. Intente recargar la página.
        </div>

        {/* Active Lotes Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            {lotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay lotes</p>
            ) : (
              <DataTable columns={lotesColumns} data={lotes} pagination={false} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardClientPage
        initialMetricas={metricas}
        initialMonth={currentMonth}
        initialYear={currentYear}
      />

      {/* Active Lotes Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay lotes</p>
          ) : (
            <DataTable columns={lotesColumns} data={lotes} pagination={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}