import { getVentas } from '@/presentation/actions/ventas';
import { getClientes } from '@/presentation/actions/clientes';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ventaColumns } from '@/components/columns/venta-columns';
import { RegistrarVentaDialog } from '@/components/forms/registrar-venta-dialog';

export default async function VentasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [ventasResult, clientesResult, lotesResult] = await Promise.all([
    getVentas(),
    getClientes(),
    getLotes(),
  ]);
  const ventas = ventasResult.success && ventasResult.ventas ? ventasResult.ventas : [];
  const clientes = clientesResult.success && clientesResult.clientes ? clientesResult.clientes : [];
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Registro de ventas del período actual</p>
        </div>
        <RegistrarVentaDialog clientes={clientes} lotes={lotes} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {ventas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay ventas en el período actual</p>
          ) : (
            <DataTable columns={ventaColumns} data={ventas} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}