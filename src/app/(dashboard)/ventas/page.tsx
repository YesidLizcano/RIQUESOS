import { getVentas } from '@/presentation/actions/ventas';
import { getClientes } from '@/presentation/actions/clientes';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { VentaResponse } from '@/presentation/dtos';
import { RegistrarVentaDialog } from '@/components/forms/registrar-venta-dialog';

const columns: ColumnDef<VentaResponse, unknown>[] = [
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) => new Date(row.getValue('fecha') as string).toLocaleDateString('es-AR'),
  },
  {
    accessorKey: 'clienteId',
    header: 'Cliente',
  },
  {
    accessorKey: 'loteId',
    header: 'Lote',
  },
  {
    accessorKey: 'cantidadVendidaKg',
    header: 'Cantidad (Kg)',
    cell: ({ row }) => Number(row.getValue('cantidadVendidaKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'precioVentaKg',
    header: 'Precio/Kg',
    cell: ({ row }) => `$${Number(row.getValue('precioVentaKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'ingresoTotal',
    header: 'Ingreso Total',
    cell: ({ row }) => `$${Number(row.getValue('ingresoTotal')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'gananciaBruta',
    header: 'Ganancia Bruta',
    cell: ({ row }) => {
      const value = Number(row.getValue('gananciaBruta'));
      return (
        <span className={value < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          ${value.toLocaleString('es-AR')}
        </span>
      );
    },
  },
];

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
            <DataTable columns={columns} data={ventas} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}