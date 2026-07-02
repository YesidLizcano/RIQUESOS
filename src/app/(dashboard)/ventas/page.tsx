import { getVentasByDateRange } from '@/presentation/actions/ventas';
import { getClientes } from '@/presentation/actions/clientes';
import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { VentasClientPage } from './ventas-client-page';

export default async function VentasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [ventasResult, clientesResult, lotesResult] = await Promise.all([
    getVentasByDateRange(currentMonth, currentYear),
    getClientes(),
    getLotes(),
  ]);
  const ventas = ventasResult.success && ventasResult.ventas ? ventasResult.ventas : [];
  const clientes = clientesResult.success && clientesResult.clientes ? clientesResult.clientes : [];
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];

  return (
    <VentasClientPage
      initialVentas={ventas}
      clientes={clientes}
      lotes={lotes}
      initialMonth={currentMonth}
      initialYear={currentYear}
    />
  );
}