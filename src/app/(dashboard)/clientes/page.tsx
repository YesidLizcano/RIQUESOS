import { getClientes } from '@/presentation/actions/clientes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { CrearClienteDialog } from '@/components/forms/crear-cliente-dialog';
import { clienteColumns } from '@/components/columns/cliente-columns';

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getClientes();
  const clientes = result.success && result.clientes ? result.clientes : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes</p>
        </div>
        <CrearClienteDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay clientes registrados</p>
          ) : (
            <DataTable columns={clienteColumns} data={clientes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}