// Idempotent seed: upsert admin user + two base products
// Run with: npx prisma db seed
import { PrismaClient, RolUsuario, TipoProducto } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Upsert admin user
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@riquesos.com' },
    update: {},
    create: {
      email: 'admin@riquesos.com',
      passwordHash,
      role: RolUsuario.ADMIN,
    },
  });

  console.log(`Admin user upserted: ${adminUser.email}`);

  // Upsert base product types (Proveedor records representing the default products)
  // Note: The design uses TipoProducto enum for product types on Lote, not a separate Product table.
  // The seed creates two sample Proveedores so the system has test data.
  const proveedor1 = await prisma.proveedor.upsert({
    where: { id: 'proveedor-default-1' },
    update: { nombre: 'Proveedor Queso Doble Crema' },
    create: {
      id: 'proveedor-default-1',
      nombre: 'Proveedor Queso Doble Crema',
      telefono: null,
    },
  });

  const proveedor2 = await prisma.proveedor.upsert({
    where: { id: 'proveedor-default-2' },
    update: { nombre: 'Proveedor Queso Semisalado' },
    create: {
      id: 'proveedor-default-2',
      nombre: 'Proveedor Queso Semisalado',
      telefono: null,
    },
  });

  console.log(`Proveedores upserted: ${proveedor1.nombre}, ${proveedor2.nombre}`);

  // Upsert system proveedor for recortes
  const proveedorRecortes = await prisma.proveedor.upsert({
    where: { id: 'proveedor-recortes-dc' },
    update: { nombre: 'Recortes Doble Crema (Sistema)' },
    create: {
      id: 'proveedor-recortes-dc',
      nombre: 'Recortes Doble Crema (Sistema)',
      telefono: null,
    },
  });

  console.log(`Proveedor recortes upserted: ${proveedorRecortes.nombre}`);

  // Upsert permanent accumulation lot for recortes
  const existingRecortesLot = await prisma.lote.findFirst({
    where: { id: 'lote-recortes-dc-permanente', deletedAt: null },
  });
  if (!existingRecortesLot) {
    await prisma.lote.create({
      data: {
        id: 'lote-recortes-dc-permanente',
        producto: 'RECORTES_DOBLE_CREMA',
        proveedorId: 'proveedor-recortes-dc',
        cantidadCompradaKg: 0,
        precioCompraBaseKg: 0,
        stockDisponibleKg: 0,
        estado: 'ACTIVO',
        estadoPago: 'PAGADO',
      },
    });
    console.log('Created permanent Recortes Doble Crema lot');
  }

  // Seed default insumos with initial CompraInsumo lots
  const existingBolsa = await prisma.empaque.findFirst({ where: { categoria: 'BOLSA', deletedAt: null } });
  if (!existingBolsa) {
    const bolsa = await prisma.empaque.create({
      data: {
        tipo: 'Bolsa',
        categoria: 'BOLSA',
        stock: 100,
        precio: 500,
      },
    });
    await prisma.compraInsumo.create({
      data: {
        empaqueId: bolsa.id,
        categoria: 'BOLSA',
        cantidad: 100,
        cantidadRestante: 100,
        precioUnitario: 500,
        costoTotal: 50000,
      },
    });
    console.log('Created: Bolsa (stock: 100, precio: 500)');
  }

  const existingSeparador = await prisma.empaque.findFirst({ where: { categoria: 'SEPARADOR', deletedAt: null } });
  if (!existingSeparador) {
    const separador = await prisma.empaque.create({
      data: {
        tipo: 'Separador',
        categoria: 'SEPARADOR',
        stock: 50,
        precio: 300,
      },
    });
    await prisma.compraInsumo.create({
      data: {
        empaqueId: separador.id,
        categoria: 'SEPARADOR',
        cantidad: 50,
        cantidadRestante: 50,
        precioUnitario: 300,
        costoTotal: 15000,
      },
    });
    console.log('Created: Separador (stock: 50 kg, precio: 300)');
  }
  // Migration: set bloquesTajadosAcumulados for existing lots that have tajados
  // This field was added to prevent cost inflation when tajados are sold.
  // For existing data, we set it equal to bloquesTajados (best approximation —
  // we don't know how many were produced historically, but current stock is a floor).
  const lotsWithTajados = await prisma.lote.findMany({
    where: { bloquesTajados: { gt: 0 }, bloquesTajadosAcumulados: 0 },
    select: { id: true, bloquesTajados: true },
  });
  if (lotsWithTajados.length > 0) {
    let updated = 0;
    for (const lote of lotsWithTajados) {
      await prisma.lote.update({
        where: { id: lote.id },
        data: { bloquesTajadosAcumulados: lote.bloquesTajados },
      });
      updated++;
    }
    console.log(`Migrated bloquesTajadosAcumulados for ${updated} lots with existing tajados`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });