import { getClientes } from '@/presentation/actions/clientes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { ClientesClientPage } from './clientes-client-page';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getClientes();
  const clientes = result.success && result.clientes ? result.clientes : [];

  return (
    <Suspense fallback={null}>
      <ClientesClientPage clientes={clientes} />
    </Suspense>
  );
}