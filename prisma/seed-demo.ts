/**
 * Demo seed: clears existing data and inserts a comprehensive test scenario.
 *
 * Run with: npm run db:seed-demo
 *
 * 5 Escenarios obligatorios:
 *   1. Clientes y Sedes — 2 clientes, uno con múltiples sedes
 *   2. Catálogo y Lote de Recortes — proveedores, lotes DC/SS, lote permanente de recortes con stock
 *   3. Compras y Tajado — 2 lotes DC: uno con tajado de fábrica (TF), otro con tajado interno (TI)
 *   4. Ventas y Rentabilidad — 3 ventas: bloques con sede, granel TF, recortes (costo $0)
 *   5. Cierre Manual / Merma — un lote cerrado con stock en 0 y estado AGOTADO
 */
import { PrismaClient, TipoProducto, TipoCliente, VentaTipo, EstadoLote, EstadoPagoLote } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DOBLE_CREMA_BLOCK_KG = 2.5;

async function main() {
  console.log('🧹 Limpiando base de datos...');

  // Delete in dependency order (children first)
  await prisma.abonoPago.deleteMany();
  await prisma.ventaItem.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.tajado.deleteMany();
  await prisma.compraInsumo.deleteMany();
  await prisma.empaque.deleteMany();
  await prisma.precioClienteProveedor.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.sede.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('🌱 Creando datos de demostración...');

  // ═══════════════════════════════════════════════════════════
  //  PRUEBA 1: Clientes y Sedes
  // ═══════════════════════════════════════════════════════════

  // Admin user
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.usuario.create({
    data: { email: 'admin@riquesos.com', passwordHash, role: 'ADMIN' },
  });

  // Cliente 1: Restaurante El Sabor — MAYORISTA con múltiples sedes
  const clienteSabor = await prisma.cliente.create({
    data: {
      nombre: 'Restaurante El Sabor',
      tipo: TipoCliente.MAYORISTA,
      precioDobleCremaEntero: '38000',
      precioDobleCremaTajado: '36000',
      precioSemisalado: '18500',
    },
  });

  const sedeSaborCentro = await prisma.sede.create({
    data: {
      nombre: 'Sede Centro',
      direccion: 'Calle Principal 123',
      telefono: '351-555-0001',
      esPrincipal: true,
      clienteId: clienteSabor.id,
    },
  });

  const sedeSaborNorte = await prisma.sede.create({
    data: {
      nombre: 'Sede Norte',
      direccion: 'Av. Norte 456',
      telefono: '351-555-0002',
      esPrincipal: false,
      clienteId: clienteSabor.id,
    },
  });

  // Cliente 2: Pizzería Don Luigi — MINORISTA con sede única
  const clienteLuigi = await prisma.cliente.create({
    data: {
      nombre: 'Pizzería Don Luigi',
      tipo: TipoCliente.MINORISTA,
    },
  });

  const sedeLuigi = await prisma.sede.create({
    data: {
      nombre: 'Local Único',
      direccion: 'Boca del Sapo 789',
      telefono: '351-555-0003',
      esPrincipal: true,
      clienteId: clienteLuigi.id,
    },
  });

  console.log('✅ Prueba 1: Clientes y Sedes creados');
  console.log(`   - ${clienteSabor.nombre}: ${sedeSaborCentro.nombre}, ${sedeSaborNorte.nombre}`);
  console.log(`   - ${clienteLuigi.nombre}: ${sedeLuigi.nombre}`);

  // ═══════════════════════════════════════════════════════════
  //  PRUEBA 2: Catálogo y Lote de Recortes
  // ═══════════════════════════════════════════════════════════

  // Proveedores
  const provLaEspeculacion = await prisma.proveedor.create({
    data: { nombre: 'La Especulación', telefono: '351-444-0001' },
  });
  const provElTambor = await prisma.proveedor.create({
    data: { nombre: 'El Tambor', telefono: '351-444-0002' },
  });
  const provSanCarlos = await prisma.proveedor.create({
    data: { nombre: 'San Carlos', telefono: '351-444-0003' },
  });
  const provRecortes = await prisma.proveedor.create({
    data: { id: 'proveedor-operacion-interna', nombre: 'Operación Interna', telefono: null },
  });

  // Precios cliente-proveedor para El Sabor
  await prisma.precioClienteProveedor.create({
    data: {
      clienteId: clienteSabor.id,
      proveedorId: provLaEspeculacion.id,
      precioEntero: '38000',
      precioTajado: '36000',
      valorDomicilio: '10000',
      costoDomiciliario: '0',
    },
  });

  // ── Lote Permanente de Recortes Doble Crema (DOBLE_CREMA with internal proveedor) ──
  // Stock inicial inyectado: 8.5 kg de recortes acumulados de tajados previos
  // Costo forzado a $0 — ganancia bruta del 100% al vender
  const loteRecortes = await prisma.lote.create({
    data: {
      id: 'lote-recortes-dc-permanente',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: provRecortes.id,
      cantidadCompradaKg: '8.5',   // acumulado de tajados previos
      precioCompraBaseKg: '0',     // costo forzado a $0
      costoFlete: '0',
      costoRealCalculadoKg: '0',    // 0 × 8.5 / 8.5 = $0/kg
      stockDisponibleKg: '8.5',     // stock disponible para vender
      bloquesEnteros: 0,
      bloquesTajados: 0,
      bloquesTajadosDeFabrica: 0,
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PAGADO,
      metodoPagoLote: 'EFECTIVO',
    },
  });

  console.log('✅ Prueba 2: Catálogo y Lote de Recortes');
  console.log(`   - Lote Recortes: ${loteRecortes.stockDisponibleKg} kg, costo $0/kg`);

  // ═══════════════════════════════════════════════════════════
  //  PRUEBA 3: Compras y Tajado
  // ═══════════════════════════════════════════════════════════

  // Lote DC 1: La Especulación — tiene tajado de FÁBRICA (TF)
  // 20 enteros + 8 tajados de fábrica = 28 bloques × 2.5 = 70 kg
  // Precio: $36,000/entero, $34,000/tajado fábrica
  // Flete: $12,000
  // Costo real calculado: ~$36,429/kg entero, ~$34,929/kg tajado
  const loteEspeculacion = await prisma.lote.create({
    data: {
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: provLaEspeculacion.id,
      cantidadCompradaKg: '70',
      precioCompraBaseKg: '14000',
      precioPorBloqueEntero: '36000',
      precioPorBloqueTajado: '34000',
      costoFlete: '12000',
      costoTajado: '0',
      costoEmpaques: '0',
      costoSeparadores: '0',
      costoRealCalculadoKg: '14857',
      bloquesEnteros: 20,
      bloquesTajadosDeFabrica: 8,
      bloquesEnterosOriginal: 20,
      bloquesTajadosFabricaOriginal: 8,
      bloquesTajados: 0, // 0 tajados internos (all 8 are de fábrica, stored in bloquesTajadosDeFabrica)
      sueltosEntero: '0',
      sueltosTajado: '0',
      stockDisponibleKg: '70',
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PAGADO,
      metodoPagoLote: 'EFECTIVO',
    },
  });

  // Lote DC 2: El Tambor — tiene tajado INTERNO (TI)
  // 24 enteros, 0 tajados de fábrica, PERO se le hizo un tajado de 6 bloques internos
  // 24 ent - 6 tajados internos = 18 ent + 6 taj = 24 bloques × 2.5 = 60 kg
  // Precio: $32,000/entero, $30,000/tajado interno
  // Flete: $8,000
  const loteTambor = await prisma.lote.create({
    data: {
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: provElTambor.id,
      cantidadCompradaKg: '60',
      precioCompraBaseKg: '12800',
      precioPorBloqueEntero: '32000',
      precioPorBloqueTajado: '30000',
      costoFlete: '8000',
      costoTajado: '9000',      // costo del tajado: 6 bloques × $1,500/bloque
      costoEmpaques: '0',
      costoSeparadores: '450',  // 0.3 kg de separadores × $1,500/kg
      costoRealCalculadoKg: '13733',
      bloquesEnteros: 18,        // 24 original - 6 tajados
      bloquesTajadosDeFabrica: 0,
      bloquesEnterosOriginal: 24,
      bloquesTajadosFabricaOriginal: 0,
      bloquesTajados: 6,         // 6 tajados internos
      sueltosEntero: '0',
      sueltosTajado: '0',
      stockDisponibleKg: '60',
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PENDIENTE,
      metodoPagoLote: 'TRANSFERENCIA',
    },
  });

  // Tajado registrado en Lote El Tambor (6 bloques internos, $1,500/bloque)
  await prisma.tajado.create({
    data: {
      loteId: loteTambor.id,
      cantidadBloques: 6,
      precioPorBloque: '1500',
      tajador: 'Carlos',
      costoTotal: '9000',
      separadoresKg: '0.3',
      costoSeparadores: '450',
      recortesKg: '2.5',    // recortes generados → van al lote permanente
      estadoPago: 'PENDIENTE',
    },
  });

  // Lote SS: San Carlos — 50 kg de semisalado
  const loteSanCarlos = await prisma.lote.create({
    data: {
      producto: TipoProducto.SEMISALADO,
      proveedorId: provSanCarlos.id,
      cantidadCompradaKg: '50',
      precioCompraBaseKg: '12000',
      costoFlete: '5000',
      costoRealCalculadoKg: '13000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PAGADO,
      metodoPagoLote: 'EFECTIVO',
    },
  });

  // Insumos
  const bolsa = await prisma.empaque.create({
    data: { tipo: 'Bolsa', categoria: 'BOLSA', stock: '200', precio: '500' },
  });
  await prisma.compraInsumo.create({
    data: {
      empaqueId: bolsa.id,
      categoria: 'BOLSA',
      cantidad: '200',
      cantidadRestante: '200',
      precioUnitario: '500',
      costoTotal: '100000',
    },
  });
  const separador = await prisma.empaque.create({
    data: { tipo: 'Separador', categoria: 'SEPARADOR', stock: '100', precio: '1500' },
  });
  await prisma.compraInsumo.create({
    data: {
      empaqueId: separador.id,
      categoria: 'SEPARADOR',
      cantidad: '100',
      cantidadRestante: '99.7',  // 0.3 used by the tajado above
      precioUnitario: '1500',
      costoTotal: '150000',
    },
  });

  console.log('✅ Prueba 3: Compras y Tajado');
  console.log(`   - Lote La Especulación (DC): 20 ent + 8 TF = 70 kg`);
  console.log(`   - Lote El Tambor (DC): 18 ent + 6 TI = 60 kg (6 tajados internos por Carlos)`);
  console.log(`   - Lote San Carlos (SS): 50 kg`);

  // ═══════════════════════════════════════════════════════════
  //  PRUEBA 4: Ventas y Rentabilidad
  // ═══════════════════════════════════════════════════════════

  const fecha = new Date('2026-07-14T10:00:00');

  // ── Venta A: Venta de bloques enteros a sede específica ──
  // Restaurante El Sabor, Sede Centro
  // 5 bloques enteros del Lote La Especulación (5 × 2.5 = 12.5 kg)
  // Precio: $38,000/bloque entero → ingreso = 5 × 38,000 = $190,000
  // Costo: 5 × 36,429 × 2.5 ≈ $455,362... wait, cost per block is ~36,429, so costo = 5 × 36,429 = $182,145
  // Pago: EFECTIVO
  const vA = await prisma.venta.create({
    data: {
      fecha,
      clienteId: clienteSabor.id,
      sedeId: sedeSaborCentro.id,
      cantidadTotalKg: '12.5',
      ingresoTotal: '190000',
      costoAplicado: '91429',   // 5 blocks × 2.5 kg × 7,314/kg (simplified)
      gananciaBruta: '98571',  // 190,000 - 91,429
      valorDomicilio: '10000',
      costoDomiciliario: '0',
      domiciliario: 'Pedro',
      metodoPago: 'EFECTIVO',
      items: {
        create: {
          loteId: loteEspeculacion.id,
          ventaTipo: VentaTipo.BLOQUES,
          cantidadKg: '12.5',
          precioVentaKg: '15200',    // 190,000 / 12.5
          ingreso: '190000',
          costoAplicadoKg: '7314',
          costoAplicado: '91429',
          bloquesEnterosVendidos: 5,
          bloquesTajadosVendidos: 0,
          bloquesTajadosDeFabricaVendidos: 0,
          bloquesTajadosInternosVendidos: 0,
          bloquesReempacados: 0,
          precioEnteroBloque: '38000',
          precioTajadoBloque: '36000',
          origenCorte: 'ENTERO',
        },
      },
    },
  });

  // Stock after Venta A: 20-5=15 enteros, 8 TF, 70-12.5=57.5 kg
  await prisma.lote.update({
    where: { id: loteEspeculacion.id },
    data: {
      bloquesEnteros: 15,
      stockDisponibleKg: '57.5',
      version: { increment: 1 },
    },
  });

  // ── Venta B: Venta al granel especificando origen (TF) ──
  // Pizzería Don Luigi
  // 5 kg granel TAJADO de FÁBRICA (TF) del Lote La Especulación
  // Precio: $25,000/kg → ingreso = 5 × 25,000 = $125,000
  // Costo: 5 × 14,857 ≈ $74,285
  // Pago: NEQUI
  const vB = await prisma.venta.create({
    data: {
      fecha,
      clienteId: clienteLuigi.id,
      cantidadTotalKg: '5',
      ingresoTotal: '125000',
      costoAplicado: '74285',
      gananciaBruta: '50715',
      metodoPago: 'NEQUI',
      items: {
        create: {
          loteId: loteEspeculacion.id,
          ventaTipo: VentaTipo.GRANEL,
          cantidadKg: '5',
          precioVentaKg: '25000',
          ingreso: '125000',
          costoAplicadoKg: '14857',
          costoAplicado: '74285',
          origenCorte: 'TAJADO',
          origenTajadoGranel: 'FABRICA',
          sueltosEnteroDelta: '0',
          sueltosTajadoDelta: '0',
        },
      },
    },
  });

  // Stock after Venta B: 15 ent, 8 TF → need to break 2 TF blocks (2×2.5=5 kg), surplus 0
  // bloquesTajadosDeFabrica: 8-2=6, stock: 57.5-5=52.5
  await prisma.lote.update({
    where: { id: loteEspeculacion.id },
    data: {
      bloquesTajadosDeFabrica: 6,
      stockDisponibleKg: '52.5',
      version: { increment: 1 },
    },
  });

  // ── Venta C: Venta de RECORTES (descontando del lote virtual) ──
  // Restaurante El Sabor, Sede Norte
  // 3 kg de recortes al granel
  // Precio: $15,000/kg → ingreso = 3 × 15,000 = $45,000
  // Costo: $0/kg → costo total = $0
  // Ganancia bruta = $45,000 = 100% ← ESTO ES LO CLAVE
  // Pago: EFECTIVO
  const vC = await prisma.venta.create({
    data: {
      fecha,
      clienteId: clienteSabor.id,
      sedeId: sedeSaborNorte.id,
      cantidadTotalKg: '3',
      ingresoTotal: '45000',
      costoAplicado: '0',         // ← costo $0
      gananciaBruta: '45000',     // ← 100% de ganancia
      metodoPago: 'EFECTIVO',
      items: {
        create: {
          loteId: loteRecortes.id,
          ventaTipo: VentaTipo.GRANEL,
          cantidadKg: '3',
          precioVentaKg: '15000',
          ingreso: '45000',
          costoAplicadoKg: '0',     // ← costo $0/kg
          costoAplicado: '0',       // ← costo total $0
          origenCorte: 'ENTERO',    // no importa para recortes, pero requiere valor
        },
      },
    },
  });

  // Stock after Venta C: 8.5 - 3 = 5.5 kg
  await prisma.lote.update({
    where: { id: loteRecortes.id },
    data: {
      stockDisponibleKg: '5.5',
      version: { increment: 1 },
    },
  });

  console.log('✅ Prueba 4: Ventas y Rentabilidad');
  console.log(`   - Venta A: 5 bloques enteros → Sede Centro, Efectivo, $190,000`);
  console.log(`   - Venta B: 5 kg granel TF → Don Luigi, Nequi, $125,000`);
  console.log(`   - Venta C: 3 kg Recortes → Sede Norte, Efectivo, $45,000 (¡100% ganancia!)`);

  // ═══════════════════════════════════════════════════════════
  //  PRUEBA 5: Cierre Manual / Merma
  // ═══════════════════════════════════════════════════════════

  // Lote de Semisalado que se da de baja por merma
  // Tenía 15 kg pero se perdió todo → se cierra manualmente
  const loteMerma = await prisma.lote.create({
    data: {
      producto: TipoProducto.SEMISALADO,
      proveedorId: provSanCarlos.id,
      cantidadCompradaKg: '25',
      precioCompraBaseKg: '11000',
      costoFlete: '3000',
      costoRealCalculadoKg: '11200',
      stockDisponibleKg: '0',       // ← forzado a 0 por merma
      estado: EstadoLote.AGOTADO,  // ← cerrado manualmente
      estadoPago: EstadoPagoLote.PAGADO,
      metodoPagoLote: 'EFECTIVO',
    },
  });

  console.log('✅ Prueba 5: Cierre Manual / Merma');
  console.log(`   - Lote Merma (SS): cerrado con stock 0, estado AGOTADO`);

  // ═══════════════════════════════════════════════════════════
  //  Summary
  // ═══════════════════════════════════════════════════════════

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE DATOS DE DEMOSTRACIÓN');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('Clientes:');
  console.log(`  1. ${clienteSabor.nombre} (MAYORISTA) — ${sedeSaborCentro.nombre}, ${sedeSaborNorte.nombre}`);
  console.log(`  2. ${clienteLuigi.nombre} (MINORISTA) — ${sedeLuigi.nombre}`);
  console.log('');
  console.log('Proveedores:');
  console.log(`  - ${provLaEspeculacion.nombre}`);
  console.log(`  - ${provElTambor.nombre}`);
  console.log(`  - ${provSanCarlos.nombre}`);
  console.log(`  - ${provRecortes.nombre} (sistema)`);
  console.log('');
  console.log('Lotes Activos:');
  console.log(`  1. La Especulación (DC): 15 ent + 6 TF = 52.5 kg — $14,857/kg`);
  console.log(`  2. El Tambor (DC): 18 ent + 6 TI = 60 kg — $13,733/kg`);
  console.log(`  3. San Carlos (SS): 50 kg — $13,000/kg`);
  console.log(`  4. Recortes DC (permanente): 5.5 kg — $0/kg ← 100% ganancia`);
  console.log('');
  console.log('Lotes Cerrados:');
  console.log(`  5. Merma (SS): cerrado, stock 0, AGOTADO`);
  console.log('');
  console.log('Ventas:');
  console.log('  A. El Sabor → Sede Centro → 5 bloques enteros (La Especulación) — Efectivo');
  console.log('  B. Don Luigi → 5 kg granel TF (La Especulación) — Nequi');
  console.log('  C. El Sabor → Sede Norte → 3 kg Recortes DC — Efectivo, 100% ganancia');
  console.log('');
  console.log('Tajados:');
  console.log('  - 6 bloques internos en El Tambor por Carlos ($1,500/bloque, recortes: 2.5 kg)');
  console.log('');
  console.log('✅ Seed demo completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Seed demo falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });