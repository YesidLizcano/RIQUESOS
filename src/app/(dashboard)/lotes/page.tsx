import { getLotes } from '@/presentation/actions/lotes';
import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { CrearLoteDialog } from '@/components/forms/crear-lote-dialog';
import { loteColumns } from '@/components/columns/lote-columns';

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
            <DataTable columns={loteColumns} data={lotes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}