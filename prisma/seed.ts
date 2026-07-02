// Idempotent seed: upsert admin user + two base products
// Run with: npx prisma db seed
import { PrismaClient, RolUsuario, TipoProducto } from '@prisma/client';
import bcrypt from 'bcrypt';

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