import { getVentas } from '@/presentation/actions/ventas';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';

export default async function VentasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getVentas();
  const ventas = result.success && result.ventas ? result.ventas : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-500 mt-1">Registro de ventas del período actual</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6">
          {ventas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay ventas en el período actual</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Lote</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Cantidad (Kg)</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Precio/Kg</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Ingreso Total</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Ganancia Bruta</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{new Date(venta.fecha).toLocaleDateString('es-AR')}</td>
                    <td className="py-3 px-4 text-gray-900">{venta.clienteId}</td>
                    <td className="py-3 px-4 text-gray-900">{venta.loteId}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{Number(venta.cantidadVendidaKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${Number(venta.precioVentaKg).toLocaleString('es-AR')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">${Number(venta.ingresoTotal).toLocaleString('es-AR')}</td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      Number(venta.gananciaBruta) < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ${Number(venta.gananciaBruta).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <nav className="mt-8 flex gap-4">
          <a href="/" className="text-blue-600 hover:underline">Dashboard</a>
          <a href="/lotes" className="text-blue-600 hover:underline">Lotes</a>
          <a href="/clientes" className="text-blue-600 hover:underline">Clientes</a>
          <a href="/gastos" className="text-blue-600 hover:underline">Gastos Fijos</a>
        </nav>
      </div>
    </main>
  );
}