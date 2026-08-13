import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../infrastructure/db';
import { PrismaLoteRepo } from '../infrastructure/repositories/PrismaLoteRepo';
import { PrismaVentaRepo } from '../infrastructure/repositories/PrismaVentaRepo';
import { PrismaClienteRepo } from '../infrastructure/repositories/PrismaClienteRepo';
import { PrismaProveedorRepo } from '../infrastructure/repositories/PrismaProveedorRepo';
import { PrismaEmpaqueRepo } from '../infrastructure/repositories/PrismaEmpaqueRepo';
import { PrismaCompraInsumoRepo } from '../infrastructure/repositories/PrismaCompraInsumoRepo';
import { PrismaTajadoRepo } from '../infrastructure/repositories/PrismaTajadoRepo';
import { PrismaAbonoPagoRepo } from '../infrastructure/repositories/PrismaAbonoPagoRepo';
import { PrismaVentaItemRepo } from '../infrastructure/repositories/PrismaVentaItemRepo';
import { PrismaPrecioClienteProveedorRepo } from '../infrastructure/repositories/PrismaPrecioClienteProveedorRepo';
import { CrearLote } from '../application/use-cases/CrearLote';
import { RegistrarVenta } from '../application/use-cases/RegistrarVenta';
import { RegistrarTajado } from '../application/use-cases/RegistrarTajado';
import { ModificarLote } from '../application/use-cases/ModificarLote';
import { EditarVenta } from '../application/use-cases/EditarVenta';
import { EliminarVenta } from '../application/use-cases/EliminarVenta';
import { RegistrarEmpaque } from '../application/use-cases/RegistrarEmpaque';
import { RegistrarCompraInsumo } from '../application/use-cases/RegistrarCompraInsumo';
import { RegistrarAbonoPago } from '../application/use-cases/RegistrarAbonoPago';
import { MarcarLotePagado } from '../application/use-cases/MarcarLotePagado';
import { MarcarFletePagado } from '../application/use-cases/MarcarFletePagado';
import { MarcarTajadoPagado } from '../application/use-cases/MarcarTajadoPagado';
import { GestionarProveedores } from '../application/use-cases/GestionarProveedores';
import { GestionarClientes } from '../application/use-cases/GestionarClientes';
import { ObtenerMetricas } from '../application/use-cases/ObtenerMetricas';
import { TipoProducto, TipoCliente, EstadoLote, MetodoPago, CategoriaInsumo } from '../domain/enums';
import { DOBLE_CREMA_BLOCK_KG, RECORTES_DC_PERMANENT_LOT_ID } from '../domain/constants';
import { Dinero } from '../domain/value-objects/Dinero';

const loteRepo = new PrismaLoteRepo();
const ventaRepo = new PrismaVentaRepo();
const clienteRepo = new PrismaClienteRepo();
const proveedorRepo = new PrismaProveedorRepo();
const empaqueRepo = new PrismaEmpaqueRepo();
const compraInsumoRepo = new PrismaCompraInsumoRepo();
const tajadoRepo = new PrismaTajadoRepo();
const abonoPagoRepo = new PrismaAbonoPagoRepo();
const ventaItemRepo = new PrismaVentaItemRepo();
const precioClienteProveedorRepo = new PrismaPrecioClienteProveedorRepo();

const crearLote = new CrearLote(loteRepo, proveedorRepo, empaqueRepo, compraInsumoRepo);
const registrarVenta = new RegistrarVenta(ventaRepo, loteRepo, clienteRepo, empaqueRepo, compraInsumoRepo, precioClienteProveedorRepo);
const registrarTajado = new RegistrarTajado(tajadoRepo, loteRepo, empaqueRepo, compraInsumoRepo);
const modificarLote = new ModificarLote(loteRepo);
const editarVenta = new EditarVenta(ventaRepo, loteRepo, clienteRepo, empaqueRepo, compraInsumoRepo, precioClienteProveedorRepo);
const eliminarVenta = new EliminarVenta(ventaRepo, loteRepo, empaqueRepo);
const registrarEmpaque = new RegistrarEmpaque(empaqueRepo, compraInsumoRepo);
const registrarCompraInsumo = new RegistrarCompraInsumo(compraInsumoRepo, empaqueRepo);
const registrarAbonoPago = new RegistrarAbonoPago(ventaRepo, abonoPagoRepo);
const marcarLotePagado = new MarcarLotePagado(loteRepo);
const marcarFletePagado = new MarcarFletePagado(loteRepo);
const marcarTajadoPagado = new MarcarTajadoPagado(tajadoRepo);
const gestionarProveedores = new GestionarProveedores(proveedorRepo);
const gestionarClientes = new GestionarClientes(clienteRepo);
const obtenerMetricas = new ObtenerMetricas(ventaRepo, loteRepo, clienteRepo, ventaItemRepo, proveedorRepo, tajadoRepo);

async function cleanDatabase() {
  await prisma.abonoPago.deleteMany();
  await prisma.ventaItem.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.tajado.deleteMany();
  await prisma.compraInsumo.deleteMany();
  await prisma.empaque.deleteMany();
  await prisma.precioClienteProveedor.deleteMany();
  await prisma.lote.deleteMany({ where: { id: { not: RECORTES_DC_PERMANENT_LOT_ID } } });
  await prisma.cliente.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.sede.deleteMany();

  await prisma.lote.upsert({
    where: { id: RECORTES_DC_PERMANENT_LOT_ID },
    update: {
      cantidadCompradaKg: 0,
      stockDisponibleKg: 0,
      precioCompraBaseKg: 0,
      precioPorBloqueEntero: 0,
      precioPorBloqueTajado: 0,
      costoFlete: 0,
      costoTajado: 0,
      costoEmpaques: 0,
      costoSeparadores: 0,
      costoRealCalculadoKg: 0,
      bloquesEnteros: 0,
      bloquesTajados: 0,
      bloquesTajadosDeFabrica: 0,
      bloquesEnterosReempacados: 0,
      bloquesTajadosFabricaReempacados: 0,
      bloquesEnterosOriginal: 0,
      bloquesTajadosFabricaOriginal: 0,
      sueltosEntero: 0,
      sueltosTajado: 0,
      estado: 'ACTIVO',
      estadoPago: 'PAGADO',
      proveedorId: null,
      deletedAt: null,
    },
    create: {
      id: RECORTES_DC_PERMANENT_LOT_ID,
      producto: 'DOBLE_CREMA',
      proveedorId: null,
      cantidadCompradaKg: 0,
      stockDisponibleKg: 0,
      precioCompraBaseKg: 0,
      precioPorBloqueEntero: 0,
      precioPorBloqueTajado: 0,
      costoFlete: 0,
      costoTajado: 0,
      costoEmpaques: 0,
      costoSeparadores: 0,
      costoRealCalculadoKg: 0,
      bloquesEnteros: 0,
      bloquesTajados: 0,
      bloquesTajadosDeFabrica: 0,
      bloquesEnterosReempacados: 0,
      bloquesTajadosFabricaReempacados: 0,
      bloquesEnterosOriginal: 0,
      bloquesTajadosFabricaOriginal: 0,
      sueltosEntero: 0,
      sueltosTajado: 0,
      estado: 'ACTIVO',
      estadoPago: 'PAGADO',
    },
  });
}

let proveedor1Id: string;
let proveedor2Id: string;
let clienteAId: string;
let clienteBId: string;
let clienteCId: string;
let loteDC1Id: string;
let loteDC2Id: string;
let loteSSId: string;
let bolsaEmpaqueId: string;
let separadorEmpaqueId: string;
let ventaAId: string;
let ventaBId: string;
let ventaCId: string;
let tajado1Id: string;
let loteDC1CostoRealKg: string;
let loteDC2CostoRealKg: string;
let loteSSCostoRealKg: string;

describe('Monthly Operations Integration Test', () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  describe('Setup', () => {
    it('should create 2 suppliers', async () => {
      const prov1 = await gestionarProveedores.crear({ nombre: 'Lacteos del Valle', telefono: '3001112222' });
      const prov2 = await gestionarProveedores.crear({ nombre: 'Quesos Andinos', telefono: '3003334444' });
      proveedor1Id = prov1.id;
      proveedor2Id = prov2.id;
      expect(prov1.nombre).toBe('Lacteos del Valle');
      expect(prov2.nombre).toBe('Quesos Andinos');
    });

    it('should create 3 customers with different pricing', async () => {
      const clientA = await gestionarClientes.crear({
        nombre: 'Supermercado La Estrella',
        tipo: TipoCliente.MAYORISTA,
        precioDobleCremaEntero: '47000',
        precioDobleCremaTajado: '49000',
        precioSemisalado: '24000',
      });
      const clientB = await gestionarClientes.crear({
        nombre: 'Tienda El Buen Precio',
        tipo: TipoCliente.MAYORISTA,
        precioDobleCremaEntero: '46000',
        precioDobleCremaTajado: '48000',
        precioSemisalado: '23500',
      });
      const clientC = await gestionarClientes.crear({
        nombre: 'Cliente Minorista Juan',
        tipo: TipoCliente.MINORISTA,
        precioSemisalado: '26000',
      });
      clienteAId = clientA.id;
      clienteBId = clientB.id;
      clienteCId = clientC.id;
      expect(clientA.precioDobleCremaEntero!.value).toBe('47000');
      expect(clientB.precioDobleCremaTajado!.value).toBe('48000');
      expect(clientC.precioDobleCremaEntero).toBeNull();
    });

    it('should register bolsas and separadores as insumos', async () => {
      const bolsaResult = await registrarEmpaque.execute({ categoria: CategoriaInsumo.BOLSA, stock: '200', precio: '500' });
      bolsaEmpaqueId = bolsaResult.empaque.id;
      expect(bolsaResult.empaque.stock.value).toBe('200');

      const separadorResult = await registrarEmpaque.execute({ categoria: CategoriaInsumo.SEPARADOR, stock: '50', precio: '8000' });
      separadorEmpaqueId = separadorResult.empaque.id;
      expect(separadorResult.empaque.stock.value).toBe('50');
    });
  });

  describe('Week 1 — Purchases & Initial Stock', () => {
    it('should buy Lote DC #1: 40 enteros, $44,000/block, flete $200,000, 5 reempacados', async () => {
      const result = await crearLote.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: proveedor1Id,
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        precioPorBloqueEntero: '44000',
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 0,
        bloquesEnterosReempacados: 5,
        costoFlete: '200000',
      });

      loteDC1Id = result.lote.id;
      const lote = result.lote;

      expect(lote.bloquesEnteros).toBe(40);
      expect(lote.bloquesEnterosOriginal).toBe(40);
      expect(lote.bloquesEnterosReempacados).toBe(5);
      expect(lote.bloquesTajadosFabricaReempacados).toBe(0);
      expect(lote.cantidadCompradaKg.value).toBe('100');
      expect(lote.precioPorBloqueEntero.value).toBe('44000');
      expect(lote.costoFlete.value).toBe('200000');

      const expectedPrecioKg = new Dinero('44000').divide(String(DOBLE_CREMA_BLOCK_KG)).value;
      expect(lote.precioCompraBaseKg.value).toBe(expectedPrecioKg);

      loteDC1CostoRealKg = lote.costoRealCalculadoKg.value;

      expect(lote.stockDisponibleKg.value).toBe('100');
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should verify FIFO bolsa deduction for reempacados in Lote DC #1', async () => {
      const bolsa = await empaqueRepo.findByCategoria(CategoriaInsumo.BOLSA);
      const activeBolsa = bolsa.find(b => b.deletedAt === null);
      expect(activeBolsa!.stock.value).toBe('195');
    });

    it('should verify Lote DC #1 cost calculations', async () => {
      const lote = await loteRepo.findById(loteDC1Id);
      expect(lote).not.toBeNull();

      const fletePorBloque = new Dinero('200000').divide('40');
      const bolsaCostFor5 = new Dinero('500').multiply('5');
      const empaquePerBloqueEntero = bolsaCostFor5.divide('40');
      const expectedCostKg = new Dinero('44000').add(fletePorBloque).add(empaquePerBloqueEntero).divide(String(DOBLE_CREMA_BLOCK_KG));

      expect(lote!.costoRealCalculadoKg.value).toBe(expectedCostKg.value);
      expect(lote!.costoTotalLote.value).toBe(
        new Dinero('44000').multiply('40').add(new Dinero('200000')).add(bolsaCostFor5).value
      );
    });

    it('should buy Lote DC #2: 20 enteros + 10 tajados de fábrica, entero $42,000, tajado $46,000, flete $150,000', async () => {
      const result = await crearLote.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: proveedor2Id,
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        precioPorBloqueEntero: '42000',
        precioPorBloqueTajado: '46000',
        bloquesEnteros: 20,
        bloquesTajadosDeFabrica: 10,
        costoFlete: '150000',
      });

      loteDC2Id = result.lote.id;
      const lote = result.lote;

      expect(lote.bloquesEnteros).toBe(20);
      expect(lote.bloquesTajadosDeFabrica).toBe(10);
      expect(lote.bloquesEnterosOriginal).toBe(20);
      expect(lote.bloquesTajadosFabricaOriginal).toBe(10);
      expect(lote.cantidadCompradaKg.value).toBe('75');
      expect(lote.precioPorBloqueEntero.value).toBe('42000');
      expect(lote.precioPorBloqueTajado.value).toBe('46000');

      loteDC2CostoRealKg = lote.costoRealCalculadoKg.value;
    });

    it('should verify Lote DC #2 cost calculations with different block prices', async () => {
      const lote = (await loteRepo.findById(loteDC2Id))!;
      expect(lote).not.toBeNull();

      const totalBloques = 30;
      const fletePorBloque = new Dinero('150000').divide(String(totalBloques));

      const valorEnteros = new Dinero('42000').multiply('20');
      const valorTajados = new Dinero('46000').multiply('10');
      const expectedCostoTotal = valorEnteros.add(valorTajados).add(new Dinero('150000'));

      expect(lote.costoTotalLote.value).toBe(expectedCostoTotal.value);

      const costoEnteroPorBloque = new Dinero('42000').add(fletePorBloque);
      const expectedCostoEnteroKg = costoEnteroPorBloque.divide(String(DOBLE_CREMA_BLOCK_KG));
      expect(lote.costoRealCalculadoKg.value).toBe(expectedCostoEnteroKg.value);

      const costoTajadoFabricaPorBloque = new Dinero('46000').add(fletePorBloque);
      const expectedCostoTajadoFabricaKg = costoTajadoFabricaPorBloque.divide(String(DOBLE_CREMA_BLOCK_KG));
      expect(lote.costoTajadoFabricaKg.value).toBe(expectedCostoTajadoFabricaKg.value);
    });

    it('should buy Lote Semisalado: 100 kg, $22,000/kg, flete $80,000', async () => {
      const result = await crearLote.execute({
        producto: TipoProducto.SEMISALADO,
        proveedorId: proveedor1Id,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '22000',
        costoFlete: '80000',
      });

      loteSSId = result.lote.id;
      const lote = result.lote;

      expect(lote.cantidadCompradaKg.value).toBe('100');
      expect(lote.precioCompraBaseKg.value).toBe('22000');
      expect(lote.costoFlete.value).toBe('80000');
      expect(lote.stockDisponibleKg.value).toBe('100');
      expect(lote.bloquesEnteros).toBe(0);
      expect(lote.bloquesTajadosDeFabrica).toBe(0);

      loteSSCostoRealKg = lote.costoRealCalculadoKg.value;

      const expectedCostKg = new Dinero('22000').multiply('100').add(new Dinero('80000')).divide('100');
      expect(lote.costoRealCalculadoKg.value).toBe(expectedCostKg.value);
    });
  });

  describe('Week 2 — Cutting & Sales', () => {
    it('should register tajado on Lote DC #1: cut 10 enteros into tajados (precioPorBloque $1,500, separadores 0.5 kg)', async () => {
      const result = await registrarTajado.execute({
        loteId: loteDC1Id,
        cantidadBloques: 10,
        precioPorBloque: '1500',
        tajador: 'Carlos',
        separadoresKg: '0.5',
      });

      tajado1Id = result.tajado.id;
      expect(result.tajado.cantidadBloques).toBe(10);
      expect(result.tajado.costoTotal.value).toBe(new Dinero('1500').multiply('10').value);
      expect(result.tajado.separadoresKg.value).toBe('0.5');
    });

    it('should verify after tajado: bloquesEnteros decreased, bloquesTajados increased', async () => {
      const lote = await loteRepo.findById(loteDC1Id);
      expect(lote!.bloquesEnteros).toBe(30);
      expect(lote!.bloquesTajados).toBe(10);
      expect(lote!.bloquesTajadosDeFabrica).toBe(0);
    });

    it('should verify costoRealCalculadoKg is IMMUTABLE after tajado', async () => {
      const lote = await loteRepo.findById(loteDC1Id);
      expect(lote!.costoRealCalculadoKg.value).toBe(loteDC1CostoRealKg);
    });

    it('should verify costoTajadoKg includes tajado + separadores cost', async () => {
      const lote = await loteRepo.findById(loteDC1Id);
      expect(lote!.bloquesTajados).toBe(10);

      const costoTajadoTotal = new Dinero('1500').multiply('10');
      const separadoresCost = lote!.costoSeparadores;
      const costoTajadoPlusSep = costoTajadoTotal.add(separadoresCost);
      const kgTajados = String(10 * DOBLE_CREMA_BLOCK_KG);
      const expectedTajadoKg = new Dinero(loteDC1CostoRealKg).add(costoTajadoPlusSep.divide(kgTajados));

      expect(lote!.costoTajadoKg.value).toBe(expectedTajadoKg.value);
    });

    it('should verify separadores stock was deducted after tajado', async () => {
      const separadores = await empaqueRepo.findByCategoria(CategoriaInsumo.SEPARADOR);
      const activeSeparador = separadores.find(s => s.deletedAt === null);
      expect(activeSeparador!.stock.value).toBe('49.5');
    });

    it('should sell to Customer A: 5 enteros + 3 tajados internos from Lote DC #1, 10 kg semisalado from Lote SS', async () => {
      const result = await registrarVenta.execute({
        clienteId: clienteAId,
        items: [
          {
            loteId: loteDC1Id,
            ventaTipo: 'BLOQUES',
            cantidadKg: String((5 + 3) * DOBLE_CREMA_BLOCK_KG),
            precioVentaKg: '47000',
            bloquesEnterosVendidos: 5,
            bloquesTajadosVendidos: 3,
            bloquesTajadosInternosVendidos: 3,
            precioEnteroBloque: '47000',
            precioTajadoBloque: '49000',
          },
          {
            loteId: loteSSId,
            ventaTipo: 'GRANEL',
            cantidadKg: '10',
            precioVentaKg: '24000',
          },
        ],
        metodoPago: MetodoPago.CREDITO,
        metodoPagoAbono: MetodoPago.EFECTIVO,
        abono: '200000',
      });

      ventaAId = result.venta.id;

      expect(result.venta.metodoPago).toBe(MetodoPago.CREDITO);
      expect(result.venta.abono.value).toBe('200000');
      expect(result.items.length).toBe(2);

      const dcItem = result.items.find(i => i.loteId === loteDC1Id)!;
      expect(dcItem.bloquesEnterosVendidos).toBe(5);
      expect(dcItem.bloquesTajadosVendidos).toBe(3);
      expect(dcItem.bloquesTajadosInternosVendidos).toBe(3);
      expect(dcItem.bloquesTajadosDeFabricaVendidos).toBe(0);
      expect(dcItem.ventaTipo).toBe('BLOQUES');

      const ssItem = result.items.find(i => i.loteId === loteSSId)!;
      expect(ssItem.cantidadKg.value).toBe('10');
    });

    it('should sell to Customer B: 5 tajados de fábrica from Lote DC #2 (BLOQUES)', async () => {
      const result = await registrarVenta.execute({
        clienteId: clienteBId,
        items: [
          {
            loteId: loteDC2Id,
            ventaTipo: 'BLOQUES',
            cantidadKg: String(5 * DOBLE_CREMA_BLOCK_KG),
            precioVentaKg: '48000',
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 5,
            bloquesTajadosDeFabricaVendidos: 5,
            bloquesTajadosInternosVendidos: 0,
            precioTajadoBloque: '48000',
          },
        ],
        metodoPago: MetodoPago.EFECTIVO,
      });

      ventaBId = result.venta.id;

      expect(result.venta.metodoPago).toBe(MetodoPago.EFECTIVO);

      const dc2Item = result.items[0];
      expect(dc2Item.bloquesTajadosVendidos).toBe(5);
      expect(dc2Item.bloquesTajadosDeFabricaVendidos).toBe(5);
      expect(dc2Item.bloquesTajadosInternosVendidos).toBe(0);
    });

    it('should verify stock deducted correctly from each lot', async () => {
      const loteDC1 = await loteRepo.findById(loteDC1Id);
      expect(loteDC1!.bloquesEnteros).toBe(25);
      expect(loteDC1!.bloquesTajados).toBe(7);
      expect(Number(loteDC1!.stockDisponibleKg.value)).toBeCloseTo(80, 0);

      const loteDC2 = await loteRepo.findById(loteDC2Id);
      expect(loteDC2!.bloquesEnteros).toBe(20);
      expect(loteDC2!.bloquesTajadosDeFabrica).toBe(5);

      const loteSS = await loteRepo.findById(loteSSId);
      expect(Number(loteSS!.stockDisponibleKg.value)).toBeCloseTo(90, 0);
    });

    it('should verify venta totals and item pricing match customer pricing', async () => {
      const resultA = await ventaRepo.findById(ventaAId);
      expect(resultA).not.toBeNull();

      const dcItem = resultA!.items.find(i => i.loteId === loteDC1Id)!;
      const expectedDCIngreso = new Dinero('47000').multiply('5').add(new Dinero('49000').multiply('3'));
      expect(dcItem.ingreso.value).toBe(expectedDCIngreso.value);

      const ssItem = resultA!.items.find(i => i.loteId === loteSSId)!;
      expect(ssItem.precioVentaKg.value).toBe('24000');

      const expectedSSIngreso = new Dinero('24000').multiply('10');
      expect(ssItem.ingreso.value).toBe(expectedSSIngreso.value);

      const resultB = await ventaRepo.findById(ventaBId);
      expect(resultB).not.toBeNull();
      const dc2Item = resultB!.items[0];
      const expectedDC2Ingreso = new Dinero('48000').multiply('5');
      expect(dc2Item.ingreso.value).toBe(expectedDC2Ingreso.value);
    });
  });

  describe('Week 3 — Payments & More Sales', () => {
    it('should mark Lote DC #1 as PAGADO (lote)', async () => {
      const result = await marcarLotePagado.execute({
        loteId: loteDC1Id,
        metodoPago: MetodoPago.NEQUI,
      });

      expect(result.lote.estadoPago).toBe('PAGADO');
      expect(result.lote.metodoPagoLote).toBe(MetodoPago.NEQUI);
    });

    it('should mark Lote DC #2 flete as PAGADO', async () => {
      const result = await marcarFletePagado.execute({
        loteId: loteDC2Id,
        metodoPago: MetodoPago.EFECTIVO,
      });

      expect(result.lote.estadoPagoFlete).toBe('PAGADO');
      expect(result.lote.metodoPagoFlete).toBe(MetodoPago.EFECTIVO);
    });

    it('should register abono (partial payment) on Customer A credit sale', async () => {
      const ventaResult = await ventaRepo.findById(ventaAId);
      const currentAbono = ventaResult!.venta.abono.value;

      const abonoResult = await registrarAbonoPago.execute({
        ventaId: ventaAId,
        monto: '100000',
        metodoPago: MetodoPago.NEQUI,
        observacion: 'Second payment',
      });

      expect(abonoResult.abono.monto.value).toBe('100000');
      expect(Number(abonoResult.saldoRestante) >= 0).toBe(true);

      const ventaAfter = await ventaRepo.findById(ventaAId);
      const totalAbono = new Dinero(currentAbono).add(new Dinero('100000'));
      expect(ventaAfter!.venta.abono.value).toBe(totalAbono.value);
    });

    it('should sell to Customer C: 8 enteros from Lote DC #1', async () => {
      const result = await registrarVenta.execute({
        clienteId: clienteCId,
        items: [
          {
            loteId: loteDC1Id,
            ventaTipo: 'BLOQUES',
            cantidadKg: String(8 * DOBLE_CREMA_BLOCK_KG),
            precioVentaKg: '50000',
            bloquesEnterosVendidos: 8,
            bloquesTajadosVendidos: 0,
            precioEnteroBloque: '50000',
          },
        ],
        metodoPago: MetodoPago.EFECTIVO,
      });

      ventaCId = result.venta.id;

      const dcItem = result.items[0];
      expect(dcItem.bloquesEnterosVendidos).toBe(8);
      expect(dcItem.bloquesTajadosVendidos).toBe(0);
    });

    it('should verify remaining stock on each lot', async () => {
      const loteDC1 = await loteRepo.findById(loteDC1Id);
      expect(loteDC1!.bloquesEnteros).toBe(17);

      const loteDC2 = await loteRepo.findById(loteDC2Id);
      expect(loteDC2!.bloquesTajadosDeFabrica).toBe(5);
      expect(loteDC2!.bloquesEnteros).toBe(20);

      const loteSS = await loteRepo.findById(loteSSId);
      expect(Number(loteSS!.stockDisponibleKg.value)).toBeCloseTo(90, 0);
    });
  });

  describe('Week 4 — Modifications & Cleanup', () => {
    it('should delete Customer B sale (5 tajados de fábrica) to free DC2 stock', async () => {
      await eliminarVenta.execute({ ventaId: ventaBId });

      const result = await ventaRepo.findById(ventaBId);
      expect(result).toBeNull();
    });

    it('should verify stock was returned to DC2 after deletion', async () => {
      const loteDC2 = await loteRepo.findById(loteDC2Id);
      expect(loteDC2!.bloquesTajadosDeFabrica).toBe(10);
    });

    it('should re-sell to Customer B with fewer blocks (3 tajados de fábrica)', async () => {
      const result = await registrarVenta.execute({
        clienteId: clienteBId,
        items: [
          {
            loteId: loteDC2Id,
            ventaTipo: 'BLOQUES',
            cantidadKg: String(3 * DOBLE_CREMA_BLOCK_KG),
            precioVentaKg: '48000',
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 3,
            bloquesTajadosDeFabricaVendidos: 3,
            bloquesTajadosInternosVendidos: 0,
            precioTajadoBloque: '48000',
          },
        ],
        metodoPago: MetodoPago.EFECTIVO,
      });

      ventaBId = result.venta.id;

      const dc2Item = result.items[0];
      expect(dc2Item.bloquesTajadosVendidos).toBe(3);
      expect(dc2Item.bloquesTajadosDeFabricaVendidos).toBe(3);
    });

    it('should verify DC2 stock after re-sale', async () => {
      const loteDC2 = await loteRepo.findById(loteDC2Id);
      expect(loteDC2!.bloquesTajadosDeFabrica).toBe(7);
    });

    it('should delete Customer C sale entirely', async () => {
      await eliminarVenta.execute({ ventaId: ventaCId });

      const result = await ventaRepo.findById(ventaCId);
      expect(result).toBeNull();
    });

    it('should verify stock was fully returned to Lote DC #1 after deletion', async () => {
      const loteDC1 = await loteRepo.findById(loteDC1Id);
      expect(loteDC1!.bloquesEnteros).toBe(25);

      const loteDC1Stock = Number(loteDC1!.stockDisponibleKg.value);
      expect(loteDC1Stock).toBeGreaterThanOrEqual(80);
    });

    it('should modify Lote SS: update costoFlete to $100,000', async () => {
      const loteSS = (await loteRepo.findById(loteSSId))!;

      const result = await modificarLote.execute({
        id: loteSSId,
        version: loteSS.version,
        costoFlete: '100000',
      });

      expect(result.costoFlete.value).toBe('100000');
      expect(result.cantidadCompradaKg.value).toBe('100');
    });

    it('should verify modified lot has updated cost calculation', async () => {
      const loteSS = (await loteRepo.findById(loteSSId))!;
      expect(loteSS.costoFlete.value).toBe('100000');

      const expectedCostKg = new Dinero('22000').multiply('100').add(new Dinero('100000')).divide('100');
      expect(loteSS.costoRealCalculadoKg.value).toBe(expectedCostKg.value);
    });
  });

  describe('Final Verification', () => {
    it('should get dashboard metrics and verify key totals', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const metrics = await obtenerMetricas.execute(startOfMonth, endOfMonth);

      expect(metrics.periodo.ventasCount).toBeGreaterThanOrEqual(2);

      expect(metrics.periodo.kgVendidos).not.toBe('0');

      expect(metrics.inventario.length).toBeGreaterThanOrEqual(2);

      expect(metrics.flujoDinero.cuentasPorCobrar).not.toBe('0');

      const dcInventory = metrics.inventarioPorTipo.find(i => i.tipo === 'DOBLE_CREMA');
      expect(dcInventory).toBeDefined();
      expect(dcInventory!.lotes).toBeGreaterThanOrEqual(2);

      const ssInventory = metrics.inventarioPorTipo.find(i => i.tipo === 'SEMISALADO');
      expect(ssInventory).toBeDefined();
    });

    it('should verify no lot has negative stock', async () => {
      const lotes = await loteRepo.findActive();
      for (const lote of lotes) {
        if (lote.id === RECORTES_DC_PERMANENT_LOT_ID) continue;
        expect(Number(lote.stockDisponibleKg.value)).toBeGreaterThanOrEqual(0);
        expect(lote.bloquesEnteros).toBeGreaterThanOrEqual(0);
        expect(lote.bloquesTajados).toBeGreaterThanOrEqual(0);
        expect(lote.bloquesTajadosDeFabrica).toBeGreaterThanOrEqual(0);
      }
    });

    it('should verify cost calculations are consistent throughout', async () => {
      const loteDC1 = (await loteRepo.findById(loteDC1Id))!;
      const loteDC2 = (await loteRepo.findById(loteDC2Id))!;
      const loteSS = (await loteRepo.findById(loteSSId))!;

      expect(loteDC1.costoRealCalculadoKg.value).toBe(loteDC1CostoRealKg);
      expect(loteDC2.costoRealCalculadoKg.value).toBe(loteDC2CostoRealKg);
      expect(loteSS.costoRealCalculadoKg.value).not.toBe(loteSSCostoRealKg);

      expect(Number(loteDC1.costoRealCalculadoKg.value)).toBeGreaterThan(0);
      expect(Number(loteDC2.costoRealCalculadoKg.value)).toBeGreaterThan(0);
      expect(Number(loteSS.costoRealCalculadoKg.value)).toBeGreaterThan(0);

      expect(loteDC1.bloquesTajados).toBe(7);
      expect(loteDC1.bloquesEnteros).toBe(25);

      expect(Number(loteDC1.costoTajadoKg.value)).toBeGreaterThan(Number(loteDC1.costoRealCalculadoKg.value));
    });

    it('should verify bolsa stock after all operations', async () => {
      const bolsas = await empaqueRepo.findByCategoria(CategoriaInsumo.BOLSA);
      const activeBolsa = bolsas.find(b => b.deletedAt === null);
      expect(activeBolsa!.stock.value).toBe('195');
    });

    it('should verify cuentas por cobrar balance is correct', async () => {
      const ventaAResult = await ventaRepo.findById(ventaAId);
      expect(ventaAResult).not.toBeNull();
      expect(ventaAResult!.venta.metodoPago).toBe(MetodoPago.CREDITO);

      const totalAbonos = new Dinero(ventaAResult!.venta.abono.value);
      const ingresoTotal = new Dinero(ventaAResult!.venta.ingresoTotal.value);
      const saldoRestante = ingresoTotal.subtract(totalAbonos);
      expect(Number(saldoRestante.value)).toBeGreaterThan(0);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const metrics = await obtenerMetricas.execute(startOfMonth, endOfMonth);
      expect(metrics.flujoDinero.cuentasPorCobrar).not.toBe('0');
    });

    it('should verify tajado pago marking works', async () => {
      const result = await marcarTajadoPagado.execute(tajado1Id);
      expect(result.estadoPago).toBe('PAGADO');
    });

    it('should verify all active lots count is correct', async () => {
      const activeLotes = await loteRepo.findActive();
      const nonRecortesLotes = activeLotes.filter(l => l.id !== RECORTES_DC_PERMANENT_LOT_ID);
      expect(nonRecortesLotes.length).toBe(3);

      const dcLotes = nonRecortesLotes.filter(l => l.producto === TipoProducto.DOBLE_CREMA);
      expect(dcLotes.length).toBe(2);

      const ssLotes = nonRecortesLotes.filter(l => l.producto === TipoProducto.SEMISALADO);
      expect(ssLotes.length).toBe(1);
    });
  });
});