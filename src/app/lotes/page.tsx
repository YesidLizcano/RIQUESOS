import { getLotes } from '@/presentation/actions/lotes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';

export default async function LotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getLotes();
  const lotes = result.success && result.lotes ? result.lotes : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lotes</h1>
          <p className="text-gray-500 mt-1">Gestión de lotes de queso</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6">
          {lotes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay lotes activos</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Producto</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Proveedor</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Cant. Comprada (Kg)</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Precio Base/Kg</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Costo Real/Kg</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Stock Disp. (Kg)</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{lote.producto}</td>
                    <td className="py-3 px-4 text-gray-900">{lote.proveedorId}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{Number(lote.cantidadCompradaKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${Number(lote.precioCompraBaseKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${Number(lote.costoRealCalculadoKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{Number(lote.stockDisponibleKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        lote.estado === 'ACTIVO'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lote.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <nav className="mt-8 flex gap-4">
          <a href="/" className="text-blue-600 hover:underline">Dashboard</a>
          <a href="/ventas" className="text-blue-600 hover:underline">Ventas</a>
          <a href="/clientes" className="text-blue-600 hover:underline">Clientes</a>
          <a href="/gastos" className="text-blue-600 hover:underline">Gastos Fijos</a>
        </nav>
      </div>
    </main>
  );
}