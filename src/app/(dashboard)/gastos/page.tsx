import { getGastos } from '@/presentation/actions/gastos';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { GastoResponse } from '@/presentation/dtos';

const columns: ColumnDef<GastoResponse, unknown>[] = [
  {
    accessorKey: 'concepto',
    header: 'Concepto',
  },
  {
    accessorKey: 'valor',
    header: 'Valor',
    cell: ({ row }) => `$${Number(row.getValue('valor')).toLocaleString('es-AR')}`,
  },
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) => new Date(row.getValue('fecha') as string).toLocaleDateString('es-AR'),
  },
];

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getGastos();
  const gastos = result.success && result.gastos ? result.gastos : [];

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gastos Fijos</h1>
        <p className="text-muted-foreground">Gestión de gastos fijos mensuales</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {gastos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay gastos fijos registrados</p>
          ) : (
            <DataTable
              columns={columns}
              data={gastos}
              footerRow={
                <tr className="border-t-2 bg-muted/50 font-semibold">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">
                    ${totalGastos.toLocaleString('es-AR')}
                  </td>
                  <td></td>
                </tr>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}