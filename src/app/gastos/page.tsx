import { getGastos } from '@/presentation/actions/gastos';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getGastos();
  const gastos = result.success && result.gastos ? result.gastos : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gastos Fijos</h1>
          <p className="text-gray-500 mt-1">Gestión de gastos fijos mensuales</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6">
          {gastos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay gastos fijos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Concepto</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Valor</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((gasto) => (
                  <tr key={gasto.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{gasto.concepto}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${Number(gasto.valor).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-gray-900">{new Date(gasto.fecha).toLocaleDateString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="py-3 px-4 text-gray-900">Total</td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    ${gastos.reduce((sum, g) => sum + Number(g.valor), 0).toLocaleString('es-AR')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <nav className="mt-8 flex gap-4">
          <a href="/" className="text-blue-600 hover:underline">Dashboard</a>
          <a href="/lotes" className="text-blue-600 hover:underline">Lotes</a>
          <a href="/ventas" className="text-blue-600 hover:underline">Ventas</a>
          <a href="/clientes" className="text-blue-600 hover:underline">Clientes</a>
        </nav>
      </div>
    </main>
  );
}