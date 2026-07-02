import { getLotes } from '@/presentation/actions/lotes';
import { getProveedores } from '@/presentation/actions/proveedores';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { LotesClientPage } from './lotes-client-page';

export default async function LotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [lotesResult, proveedoresResult] = await Promise.all([
    getLotes(),
    getProveedores(),
  ]);
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];

  return <LotesClientPage lotes={lotes} proveedores={proveedores} />;
}