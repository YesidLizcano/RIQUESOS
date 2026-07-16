// Seed: Create a default "Principal" Sede for each existing Cliente
// This ensures backward compatibility — existing ventas without sedeId will display "Principal" by default.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({ where: { deletedAt: null } });
  let created = 0;
  let skipped = 0;

  for (const c of clientes) {
    // Check if a "Principal" sede already exists for this client
    const existing = await prisma.sede.findFirst({
      where: { clienteId: c.id, nombre: 'Principal', deletedAt: null },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.sede.create({
      data: {
        nombre: 'Principal',
        esPrincipal: true,
        clienteId: c.id,
      },
    });
    created++;
  }

  console.log(`Seed sedes: Created ${created} default sedes, skipped ${skipped} (already exist).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });