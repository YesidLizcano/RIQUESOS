import { getClientes } from '@/presentation/actions/clientes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { ClienteResponse } from '@/presentation/dtos';
import { CrearClienteDialog } from '@/components/forms/crear-cliente-dialog';

const columns: ColumnDef<ClienteResponse, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => {
      const tipo = row.getValue('tipo') as string;
      return (
        <Badge variant={tipo === 'MAYORISTA' ? 'default' : 'secondary'}>
          {tipo}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'precioDobleCrema',
    header: 'Precio Doble Crema',
    cell: ({ row }) => {
      const value = row.getValue('precioDobleCrema') as string | null;
      return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
    },
  },
  {
    accessorKey: 'precioSemisalado',
    header: 'Precio Semisalado',
    cell: ({ row }) => {
      const value = row.getValue('precioSemisalado') as string | null;
      return value ? `$${Number(value).toLocaleString('es-AR')}` : '—';
    },
  },
];

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
            <DataTable columns={columns} data={clientes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}