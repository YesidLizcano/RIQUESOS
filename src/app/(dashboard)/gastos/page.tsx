import { getGastosByDateRange } from '@/presentation/actions/gastos';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { GastosClientPage } from './gastos-client-page';

export const dynamic = 'force-dynamic';

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const result = await getGastosByDateRange(currentMonth, currentYear);
  const gastos = result.success && result.gastos ? result.gastos : [];

  return (
    <GastosClientPage
      initialGastos={gastos}
      initialMonth={currentMonth}
      initialYear={currentYear}
    />
  );
}