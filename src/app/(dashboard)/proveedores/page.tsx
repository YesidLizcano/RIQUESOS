import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { ProveedorResponse } from '@/presentation/dtos';
import { CrearProveedorDialog } from '@/components/forms/crear-proveedor-dialog';

const columns: ColumnDef<ProveedorResponse, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    cell: ({ row }) => {
      const telefono = row.getValue('telefono') as string | null;
      return telefono || '—';
    },
  },
];

export default async function ProveedoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getProveedores();
  const proveedores = result.success && result.proveedores ? result.proveedores : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores</p>
        </div>
        <CrearProveedorDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {proveedores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay proveedores registrados</p>
          ) : (
            <DataTable columns={columns} data={proveedores} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}