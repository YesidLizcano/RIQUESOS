import { getLotes } from '@/presentation/actions/lotes';
import { getProveedoresIncludeDeleted } from '@/presentation/actions/proveedores';
import { getAlertas } from '@/presentation/actions/dashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { LotesClientPage } from './lotes-client-page';

export default async function LotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [lotesResult, proveedoresResult, alertasResult] = await Promise.all([
    getLotes(),
    getProveedoresIncludeDeleted(),
    getAlertas(),
  ]);
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];
  const alertas = alertasResult.success ? alertasResult.alertas : [];

  return <LotesClientPage lotes={lotes} proveedores={proveedores} alertas={alertas} />;
}