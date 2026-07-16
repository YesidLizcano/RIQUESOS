import { getLotes } from '@/presentation/actions/lotes';
import { getProveedoresIncludeDeleted } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LotesClientPage } from './lotes-client-page';

export const dynamic = 'force-dynamic';

export default async function LotesPage({ searchParams }: { searchParams: Promise<{ estadoPago?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { estadoPago } = await searchParams;

  const [lotesResult, proveedoresResult] = await Promise.all([
    getLotes(),
    getProveedoresIncludeDeleted(),
  ]);
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];

  return (
    <Suspense fallback={null}>
      <LotesClientPage lotes={lotes} proveedores={proveedores} initialEstadoPago={estadoPago} />
    </Suspense>
  );
}