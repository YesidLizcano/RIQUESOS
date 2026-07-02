import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { ProveedoresClientPage } from './proveedores-client-page';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getProveedores();
  const proveedores = result.success && result.proveedores ? result.proveedores : [];

  return <ProveedoresClientPage proveedores={proveedores} />;
}