import { getMetricas } from '@/presentation/actions/dashboard';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { DashboardClientPage } from './dashboard-client-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { lotesColumns } from '@/components/columns/dashboard-lote-columns';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const now = new Date();
  const inicio = formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
  const fin = formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [metricasResult, lotesResult] = await Promise.all([
    getMetricas(inicio, fin),
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
              <Suspense>
                <DataTable columns={lotesColumns} data={lotes} pagination={false} />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Suspense>
        <DashboardClientPage
          initialMetricas={metricas}
          initialInicio={inicio}
          initialFin={fin}
        />
      </Suspense>

      {/* Active Lotes Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay lotes</p>
          ) : (
            <Suspense>
              <DataTable columns={lotesColumns} data={lotes} pagination={false} />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  );
}