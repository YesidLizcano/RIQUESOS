// Data Migration Script: Convert existing Venta records to Venta + VentaItem model
// Run with: npx tsx scripts/migrate-venta-items.ts
//
// This script:
// 1. Reads all existing Venta records (which still have the old columns if they exist)
// 2. Creates a VentaItem for each Venta, copying the old fields
// 3. Updates Venta records to set cantidadTotalKg = cantidadVendidaKg
// 4. Uses a transaction for safety

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Venta → VentaItem migration...');

  // Check if migration is needed by looking for Venta records without VentaItems
  const ventasWithoutItems = await prisma.venta.count({
    where: { items: { none: {} } },
  });

  if (ventasWithoutItems === 0) {
    console.log('All Ventas already have VentaItems. No migration needed.');
    return;
  }

  console.log(`Found ${ventasWithoutItems} Ventas without VentaItems. Migrating...`);

  // Get all ventas that need migration
  // Using raw query since the old columns may still exist in the DB
  const ventas = await prisma.venta.findMany({
    where: { items: { none: {} } },
  });

  console.log(`Processing ${ventas.length} Ventas...`);

  let migrated = 0;
  let errors = 0;

  for (const venta of ventas) {
    try {
      await prisma.$transaction(async (tx) => {
        // Create a VentaItem from the Venta's data
        // Use type assertion to access old columns that may still exist in the raw data
        const rawVenta = venta as Record<string, unknown>;

        const cantidadKg = String(rawVenta.cantidadVendidaKg ?? rawVenta.cantidadTotalKg ?? '0');
        const precioVentaKg = String(rawVenta.precioVentaKg ?? '0');
        const costoAplicado = String(rawVenta.costoAplicado ?? '0');
        const ingresoTotal = String(rawVenta.ingresoTotal ?? '0');
        const ventaTipo = String(rawVenta.ventaTipo ?? 'GRANEL');
        const bloquesEnterosVendidos = Number(rawVenta.bloquesEnterosVendidos ?? 0);
        const bloquesTajadosVendidos = Number(rawVenta.bloquesTajadosVendidos ?? 0);
        const bloquesReempacados = Number(rawVenta.bloquesReempacados ?? 0);
        const costoEmpaques = String(rawVenta.costoEmpaques ?? '0');
        const loteId = String(rawVenta.loteId ?? '');

        // Calculate costoAplicadoKg from costoAplicado / cantidadKg
        const cantidadNum = Number(cantidadKg);
        const costoAplicadoNum = Number(costoAplicado);
        const costoAplicadoKg = cantidadNum > 0 ? String(costoAplicadoNum / cantidadNum) : '0';

        // Create VentaItem
        await tx.ventaItem.create({
          data: {
            ventaId: venta.id,
            loteId: loteId,
            ventaTipo: ventaTipo === 'BLOQUES' || ventaTipo === 'GRANEL' ? ventaTipo : 'GRANEL',
            cantidadKg: cantidadNum,
            precioVentaKg: Number(precioVentaKg),
            ingreso: Number(ingresoTotal),
            costoAplicadoKg: Number(costoAplicadoKg),
            costoAplicado: costoAplicadoNum,
            bloquesEnterosVendidos,
            bloquesTajadosVendidos,
            bloquesReempacados,
            costoEmpaques: Number(costoEmpaques),
          },
        });

        // Update Venta to set cantidadTotalKg if it's still 0
        if (Number(venta.cantidadTotalKg) === 0 && cantidadNum > 0) {
          await tx.venta.update({
            where: { id: venta.id },
            data: { cantidadTotalKg: cantidadNum },
          });
        }
      });

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  Migrated ${migrated}/${ventas.length} Ventas...`);
      }
    } catch (error) {
      errors++;
      console.error(`Error migrating Venta ${venta.id}:`, error);
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${errors} errors.`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });