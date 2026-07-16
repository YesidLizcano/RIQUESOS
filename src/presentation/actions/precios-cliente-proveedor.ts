'use server';

import { requireSession } from './auth';
import { prisma } from '@/infrastructure/db';

export async function getPreciosByCliente(clienteId: string) {
  await requireSession();
  const precios = await prisma.precioClienteProveedor.findMany({
    where: { clienteId },
  });
  return precios.map((p) => ({
    proveedorId: p.proveedorId,
    precioEntero: p.precioEntero.toString(),
    precioTajado: p.precioTajado.toString(),
    valorDomicilio: p.valorDomicilio.toString(),
    costoDomiciliario: p.costoDomiciliario.toString(),
  }));
}