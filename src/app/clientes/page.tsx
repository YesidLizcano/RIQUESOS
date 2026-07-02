import { getClientes } from '@/presentation/actions/clientes';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { redirect } from 'next/navigation';

export default async function ClientesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const result = await getClientes();
  const clientes = result.success && result.clientes ? result.clientes : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6">
          {clientes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay clientes registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Nombre</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium">Tipo</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Precio Doble Crema</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">Precio Semisalado</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{cliente.nombre}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        cliente.tipo === 'MAYORISTA'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {cliente.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {cliente.precioDobleCrema ? `$${Number(cliente.precioDobleCrema).toLocaleString('es-AR')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {cliente.precioSemisalado ? `$${Number(cliente.precioSemisalado).toLocaleString('es-AR')}` : '—'}
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
          <a href="/ventas" className="text-blue-600 hover:underline">Ventas</a>
          <a href="/gastos" className="text-blue-600 hover:underline">Gastos Fijos</a>
        </nav>
      </div>
    </main>
  );
}