import { getLotes } from '@/presentation/actions/lotes';
import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { LoteResponse } from '@/presentation/dtos';
import { CrearLoteDialog } from '@/components/forms/crear-lote-dialog';

const columns: ColumnDef<LoteResponse, unknown>[] = [
  {
    accessorKey: 'producto',
    header: 'Producto',
  },
  {
    accessorKey: 'proveedorId',
    header: 'Proveedor',
  },
  {
    accessorKey: 'cantidadCompradaKg',
    header: 'Cant. Comprada (Kg)',
    cell: ({ row }) => Number(row.getValue('cantidadCompradaKg')).toLocaleString('es-AR'),
  },
  {
    accessorKey: 'precioCompraBaseKg',
    header: 'Precio Base/Kg',
    cell: ({ row }) => `$${Number(row.getValue('precioCompraBaseKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'costoRealCalculadoKg',
    header: 'Costo Real/Kg',
    cell: ({ row }) => `$${Number(row.getValue('costoRealCalculadoKg')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'stockDisponibleKg',
    header: 'Stock Disp. (Kg)',
    cell: ({ row }) => Number(row.getValue('stockDisponibleKg')).toLocaleString('es-AR'),
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

export default async function LotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [lotesResult, proveedoresResult] = await Promise.all([
    getLotes(),
    getProveedores(),
  ]);
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lotes</h1>
          <p className="text-muted-foreground">Gestión de lotes de queso</p>
        </div>
        <CrearLoteDialog proveedores={proveedores} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {lotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay lotes activos</p>
          ) : (
            <DataTable columns={columns} data={lotes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}