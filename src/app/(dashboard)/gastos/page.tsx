import { getGastos } from '@/presentation/actions/gastos';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { GastosClientPage } from './gastos-client-page';

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getGastos();
  const gastos = result.success && result.gastos ? result.gastos : [];

  return <GastosClientPage gastos={gastos} />;
}