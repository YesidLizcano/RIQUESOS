import { getTajados } from '@/presentation/actions/tajados';
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

  const result = await getTajados(inicio, fin);
  const tajados = result.success && result.tajados ? result.tajados : [];

  return (
    <Suspense fallback={null}>
      <TajadosClientPage tajados={tajados} initialEstado={estado} />
    </Suspense>
  );
}