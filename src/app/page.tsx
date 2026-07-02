import { getMetricas } from '@/presentation/actions/dashboard';
import { getLotes } from '@/presentation/actions/lotes';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const [metricasResult, lotesResult] = await Promise.all([
    getMetricas(),
    getLotes(),
  ]);

  const metricas = metricasResult.success ? metricasResult.metricas : null;
  const lotes = lotesResult.success ? lotesResult.lotes : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">Resumen de métricas del negocio</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        {metricas ? (
          <>
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900">${Number(metricas.periodo.ingresoTotal).toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Costo Mercancía</p>
                <p className="text-2xl font-bold text-gray-900">${Number(metricas.periodo.costoMercancia).toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Ganancia Bruta</p>
                <p className="text-2xl font-bold text-gray-900">${Number(metricas.periodo.gananciaBruta).toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Gastos Fijos</p>
                <p className="text-2xl font-bold text-gray-900">${Number(metricas.periodo.gastosFijos).toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-500">Ganancia Neta</p>
                <p className={`text-2xl font-bold ${Number(metricas.periodo.gananciaNeta) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Number(metricas.periodo.gananciaNeta).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {/* Inventory and Top Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventario por Producto</h2>
                {metricas.inventario.length === 0 ? (
                  <p className="text-gray-500">No hay inventario activo</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-600">Producto</th>
                        <th className="text-right py-2 text-gray-600">Stock (Kg)</th>
                        <th className="text-right py-2 text-gray-600">Lotes Activos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricas.inventario.map((item) => (
                        <tr key={item.producto} className="border-b">
                          <td className="py-2 text-gray-900">{item.producto}</td>
                          <td className="py-2 text-right text-gray-900">{Number(item.stockDisponibleKg).toLocaleString('es-AR')}</td>
                          <td className="py-2 text-right text-gray-900">{item.lotesActivos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Clientes</h2>
                {metricas.topClientes.length === 0 ? (
                  <p className="text-gray-500">No hay ventas en el período</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-600">Cliente</th>
                        <th className="text-right py-2 text-gray-600">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricas.topClientes.map((c) => (
                        <tr key={c.clienteId} className="border-b">
                          <td className="py-2 text-gray-900">{c.nombre}</td>
                          <td className="py-2 text-right text-gray-900">${Number(c.ingresoTotal).toLocaleString('es-AR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            Error al cargar las métricas. Intente recargar la página.
          </div>
        )}

        {/* Active Lotes Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lotes Activos</h2>
          {lotes.length === 0 ? (
            <p className="text-gray-500">No hay lotes activos</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-600">Producto</th>
                  <th className="text-right py-2 text-gray-600">Stock (Kg)</th>
                  <th className="text-right py-2 text-gray-600">Costo Real/Kg</th>
                  <th className="text-right py-2 text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} className="border-b">
                    <td className="py-2 text-gray-900">{lote.producto}</td>
                    <td className="py-2 text-right text-gray-900">{Number(lote.stockDisponibleKg).toLocaleString('es-AR')}</td>
                    <td className="py-2 text-right text-gray-900">${Number(lote.costoRealCalculadoKg).toLocaleString('es-AR')}</td>
                    <td className="py-2 text-right">
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
          <a href="/lotes" className="text-blue-600 hover:underline">Lotes</a>
          <a href="/ventas" className="text-blue-600 hover:underline">Ventas</a>
          <a href="/clientes" className="text-blue-600 hover:underline">Clientes</a>
          <a href="/gastos" className="text-blue-600 hover:underline">Gastos Fijos</a>
        </nav>
      </div>
    </main>
  );
}