import { getVentasByExactDateRange } from '@/presentation/actions/ventas';
import { getClientesIncludeDeleted } from '@/presentation/actions/clientes';
import { getLotesIncludeDeleted } from '@/presentation/actions/lotes';
import { getProveedoresIncludeDeleted } from '@/presentation/actions/proveedores';
import { getEmpaques } from '@/presentation/actions/empaques';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { VentasClientPage } from './ventas-client-page';
import { CategoriaInsumo } from '@/domain/enums';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ metodoPago?: string; saldo?: string; inicio?: string; fin?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const { metodoPago, saldo, inicio: paramInicio, fin: paramFin } = await searchParams;

  const now = new Date();
  // Default to current month if no dates provided
  const inicio = paramInicio ?? formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), 1));
  const fin = paramFin ?? formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [ventasResult, clientesResult, lotesResult, proveedoresResult, empaquesResult] = await Promise.all([
    getVentasByExactDateRange(inicio, fin),
    getClientesIncludeDeleted(),
    getLotesIncludeDeleted(),
    getProveedoresIncludeDeleted(),
    getEmpaques(),
  ]);
  const ventas = ventasResult.success && ventasResult.ventas ? ventasResult.ventas : [];
  const clientes = clientesResult.success && clientesResult.clientes ? clientesResult.clientes : [];
  const lotes = lotesResult.success && lotesResult.lotes ? lotesResult.lotes : [];
  const proveedores = proveedoresResult.success && proveedoresResult.proveedores ? proveedoresResult.proveedores : [];
  const empaques = empaquesResult.success ? empaquesResult.empaques : [];
  const precioBolsa = empaques
    .filter(e => e.categoria === CategoriaInsumo.BOLSA)
    .reduce((min, e) => Math.min(min, Number(e.precio)), Infinity);

  return (
    <Suspense fallback={null}>
      <VentasClientPage
      initialVentas={ventas}
      clientes={clientes}
      lotes={lotes}
      proveedores={proveedores}
      precioBolsa={precioBolsa === Infinity ? 0 : precioBolsa}
      initialInicio={inicio}
      initialFin={fin}
      initialMetodoPago={metodoPago}
      initialSaldoPendiente={saldo === 'PENDIENTE'}
    />
    </Suspense>
  );
}