import { getEmpaques } from '@/presentation/actions/empaques';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';
import { EmpaquesClientPage } from './empaques-client-page';

export const dynamic = 'force-dynamic';

export default async function EmpaquesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getEmpaques();
  const empaques = result.success && result.empaques ? result.empaques : [];

  return <EmpaquesClientPage empaques={empaques} />;
}