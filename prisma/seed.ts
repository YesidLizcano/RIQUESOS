// Minimal seed: admin user + permanent recortes lot only
// Run with: npx prisma db seed
import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Upsert admin user
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

  // 2. Upsert permanent recortes lot (DOBLE_CREMA with no proveedor — internal)
  const existingRecortesLot = await prisma.lote.findFirst({
    where: { id: 'lote-recortes-dc-permanente', deletedAt: null },
  });

  if (!existingRecortesLot) {
    await prisma.lote.create({
      data: {
        id: 'lote-recortes-dc-permanente',
        producto: 'DOBLE_CREMA',
        proveedorId: null,
        cantidadCompradaKg: 0,
        precioCompraBaseKg: 0,
        stockDisponibleKg: 0,
        estado: 'ACTIVO',
        estadoPago: 'PAGADO',
      },
    });
    console.log('Created permanent Recortes Doble Crema lot');
  } else {
    // Ensure proveedorId stays null
    await prisma.lote.updateMany({
      where: { id: 'lote-recortes-dc-permanente' },
      data: { proveedorId: null },
    });
    console.log('Recortes Doble Crema lot already exists (proveedorId ensured null)');
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