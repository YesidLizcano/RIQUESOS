import { getMetricas } from '@/presentation/actions/dashboard';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { MetricCard } from '@/components/dashboard-metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { InventarioPorProductoResponse, TopClienteResponse, LoteResponse } from '@/presentation/dtos';

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

  const [metricasResult, lotesResult] = await Promise.all([
    getMetricas(),
    getLotes(),
  ]);

  const metricas = metricasResult.success ? metricasResult.metricas : null;
  const lotes = lotesResult.success ? lotesResult.lotes : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de métricas del negocio</p>
      </div>

      {metricas ? (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Ingresos"
              value={`$${Number(metricas.periodo.ingresoTotal).toLocaleString('es-AR')}`}
            />
            <MetricCard
              title="Costo Mercancía"
              value={`$${Number(metricas.periodo.costoMercancia).toLocaleString('es-AR')}`}
            />
            <MetricCard
              title="Ganancia Bruta"
              value={`$${Number(metricas.periodo.gananciaBruta).toLocaleString('es-AR')}`}
            />
            <MetricCard
              title="Gastos Fijos"
              value={`$${Number(metricas.periodo.gastosFijos).toLocaleString('es-AR')}`}
            />
            <MetricCard
              title="Ganancia Neta"
              value={`$${Number(metricas.periodo.gananciaNeta).toLocaleString('es-AR')}`}
              variant={Number(metricas.periodo.gananciaNeta) < 0 ? 'destructive' : 'success'}
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
        </>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Error al cargar las métricas. Intente recargar la página.
        </div>
      )}

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