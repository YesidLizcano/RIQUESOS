import { getTajados } from '@/presentation/actions/tajados';
import { getLotes } from '@/presentation/actions/lotes';
import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TajadosClientPage } from './tajados-client-page';

export const dynamic = 'force-dynamic';

export default async function TajadosPage({ searchParams }: { searchParams: Promise<{ inicio?: string; fin?: string; estado?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { inicio, fin, estado } = await searchParams;

  const [tajadosResult, lotesResult, proveedoresResult] = await Promise.all([
    getTajados(inicio, fin),
    getLotes(),
    getProveedores(),
  ]);

  const tajados = tajadosResult.success && tajadosResult.tajados ? tajadosResult.tajados : [];
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];

  return (
    <Suspense fallback={null}>
      <TajadosClientPage tajados={tajados} lotes={lotes} proveedores={proveedores} initialEstado={estado} />
    </Suspense>
  );
}