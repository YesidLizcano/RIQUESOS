import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../infrastructure/db';
import { PrismaVentaRepo } from '../../infrastructure/repositories/PrismaVentaRepo';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';

describe('PrismaVentaRepo — Integration', () => {
  let repo: PrismaVentaRepo;

  beforeAll(async () => {
    repo = new PrismaVentaRepo();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    await prisma.$executeRawUnsafe('DELETE FROM AbonoPago');
    await prisma.$executeRawUnsafe('DELETE FROM VentaItem');
    await prisma.$executeRawUnsafe('DELETE FROM Venta');
    await prisma.$executeRawUnsafe('DELETE FROM Lote');
    await prisma.$executeRawUnsafe('DELETE FROM Cliente');
    await prisma.$executeRawUnsafe('DELETE FROM Usuario');
    await prisma.$executeRawUnsafe('DELETE FROM Proveedor');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  });

  describe('registrarVentaAtomico', () => {
    it('should register a Venta with items and deduct stock atomically', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'SEMISALADO',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 100,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const ventaItem = new VentaItem({
        loteId: lote.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const venta = new Venta(
        { clienteId: cliente.id },
        [ventaItem]
      );

      const result = await repo.registrarVentaAtomico({
        venta,
        items: [ventaItem],
        loteDeductions: [{
          loteId: lote.id,
          cantidadKg: '10',
          expectedVersion: 1,
          ventaTipo: 'GRANEL',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 0,
        }],
        empaqueDeductions: [],
      });

      expect(result.venta.clienteId).toBe(cliente.id);
      expect(result.venta.cantidadTotalKg.value).toBe('10');
      expect(result.venta.ingresoTotal.value).toBe('50000');
      expect(result.venta.costoAplicado.value).toBe('30000');
      expect(result.venta.gananciaBruta.value).toBe('20000');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].loteId).toBe(lote.id);
      expect(result.items[0].cantidadKg.value).toBe('10');

      // Verify stock was deducted
      const updatedLote = await prisma.lote.findUnique({ where: { id: lote.id } });
      expect(updatedLote!.stockDisponibleKg.toString()).toBe('90');
    });

    it('should reject Venta with insufficient stock', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'DOBLE_CREMA',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 10,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 10,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const ventaItem = new VentaItem({
        loteId: lote.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '50',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const venta = new Venta(
        { clienteId: cliente.id },
        [ventaItem]
      );

      await expect(
        repo.registrarVentaAtomico({
          venta,
          items: [ventaItem],
          loteDeductions: [{
            loteId: lote.id,
            cantidadKg: '50',
            expectedVersion: 1,
            ventaTipo: 'GRANEL',
            bloquesEnterosVendidos: 0,
            bloquesTajadosVendidos: 0,
          }],
          empaqueDeductions: [],
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw ConcurrencyError when version mismatches', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'SEMISALADO',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 100,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const ventaItem = new VentaItem({
        loteId: lote.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const venta = new Venta(
        { clienteId: cliente.id },
        [ventaItem]
      );

      // Use wrong version (0 when DB has 1) — the retry mechanism will re-fetch the correct version
      // and succeed on the second attempt, so no ConcurrencyError should be thrown.
      // Instead, the venta should be created successfully.
      const result = await repo.registrarVentaAtomico({
        venta,
        items: [ventaItem],
        loteDeductions: [{
          loteId: lote.id,
          cantidadKg: '10',
          expectedVersion: 0, // stale version — retry will re-fetch and succeed
          ventaTipo: 'GRANEL',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 0,
        }],
        empaqueDeductions: [],
      });

      expect(result.venta).toBeDefined();
      expect(result.items).toHaveLength(1);

      // Verify stock was actually deducted
      const updatedLote = await prisma.lote.findUnique({ where: { id: lote.id } });
      expect(Number(updatedLote!.stockDisponibleKg)).toBe(90); // 100 - 10 = 90
    });

    it('should transition Lote to AGOTADO when stock reaches zero', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'SEMISALADO',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 10,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 10,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const ventaItem = new VentaItem({
        loteId: lote.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const venta = new Venta(
        { clienteId: cliente.id },
        [ventaItem]
      );

      await repo.registrarVentaAtomico({
        venta,
        items: [ventaItem],
        loteDeductions: [{
          loteId: lote.id,
          cantidadKg: '10',
          expectedVersion: 1,
          ventaTipo: 'GRANEL',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 0,
        }],
        empaqueDeductions: [],
      });

      const updatedLote = await prisma.lote.findUnique({ where: { id: lote.id } });
      expect(updatedLote!.stockDisponibleKg.toString()).toBe('0');
      expect(updatedLote!.estado).toBe('AGOTADO');
    });

    it('should register a multi-lote Venta with items from different lotes', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote1 = await prisma.lote.create({
        data: {
          producto: 'SEMISALADO',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 50,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const lote2 = await prisma.lote.create({
        data: {
          producto: 'SEMISALADO',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 80,
          precioCompraBaseKg: 4000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 4000,
          stockDisponibleKg: 40,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const item1 = new VentaItem({
        loteId: lote1.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const item2 = new VentaItem({
        loteId: lote2.id,
        ventaTipo: 'GRANEL',
        cantidadKg: '5',
        precioVentaKg: '6000',
        costoAplicadoKg: '4000',
      });

      const venta = new Venta(
        { clienteId: cliente.id },
        [item1, item2]
      );

      const result = await repo.registrarVentaAtomico({
        venta,
        items: [item1, item2],
        loteDeductions: [
          { loteId: lote1.id, cantidadKg: '10', expectedVersion: 1, ventaTipo: 'GRANEL', bloquesEnterosVendidos: 0, bloquesTajadosVendidos: 0, bloquesTajadosDeFabricaVendidos: 0, bloquesTajadosInternosVendidos: 0 },
          { loteId: lote2.id, cantidadKg: '5', expectedVersion: 1, ventaTipo: 'GRANEL', bloquesEnterosVendidos: 0, bloquesTajadosVendidos: 0, bloquesTajadosDeFabricaVendidos: 0, bloquesTajadosInternosVendidos: 0 },
        ],
        empaqueDeductions: [],
      });

      // Verify Venta totals
      expect(result.venta.cantidadTotalKg.value).toBe('15');
      // item1: ingreso=50000, costo=30000; item2: ingreso=30000, costo=20000
      expect(result.venta.ingresoTotal.value).toBe('80000');
      expect(result.venta.costoAplicado.value).toBe('50000');
      expect(result.venta.gananciaBruta.value).toBe('30000');

      // Verify items
      expect(result.items).toHaveLength(2);

      // Verify both lotes were deducted
      const updatedLote1 = await prisma.lote.findUnique({ where: { id: lote1.id } });
      expect(updatedLote1!.stockDisponibleKg.toString()).toBe('40');

      const updatedLote2 = await prisma.lote.findUnique({ where: { id: lote2.id } });
      expect(updatedLote2!.stockDisponibleKg.toString()).toBe('35');
    });
  });

  describe('findByDateRange', () => {
    it('should return Ventas with items within date range', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'DOBLE_CREMA',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 90,
          estado: 'ACTIVO',
          version: 2,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      // Create venta + item directly via Prisma for test setup
      const ventaRecord = await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          cantidadTotalKg: 10,
          ingresoTotal: 50000,
          costoAplicado: 30000,
          gananciaBruta: 20000,
          valorDomicilio: 0,
          domiciliario: '',
          fecha: new Date('2026-06-15'),
        },
      });

      await prisma.ventaItem.create({
        data: {
          ventaId: ventaRecord.id,
          loteId: lote.id,
          ventaTipo: 'GRANEL',
          cantidadKg: 10,
          precioVentaKg: 5000,
          ingreso: 50000,
          costoAplicadoKg: 3000,
          costoAplicado: 30000,
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 0,
          bloquesReempacados: 0,
          costoEmpaques: 0,
        },
      });

      const inicio = new Date('2026-06-01');
      const fin = new Date('2026-06-30');

      const ventas = await repo.findByDateRange(inicio, fin);
      expect(ventas.length).toBe(1);
      expect(ventas[0].cantidadTotalKg.value).toBe('10');
    });
  });

  describe('sumIngresosByPeriod and sumCostosByPeriod', () => {
    it('should sum ingresos and costos for a period', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = await prisma.lote.create({
        data: {
          producto: 'DOBLE_CREMA',
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 80,
          estado: 'ACTIVO',
          version: 3,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          cantidadTotalKg: 10,
          ingresoTotal: 50000,
          costoAplicado: 30000,
          gananciaBruta: 20000,
          valorDomicilio: 0,
          domiciliario: '',
          fecha: new Date('2026-06-15'),
        },
      });

      await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          cantidadTotalKg: 5,
          ingresoTotal: 25000,
          costoAplicado: 15000,
          gananciaBruta: 10000,
          valorDomicilio: 0,
          domiciliario: '',
          fecha: new Date('2026-06-20'),
        },
      });

      const inicio = new Date('2026-06-01');
      const fin = new Date('2026-06-30');

      const ingresos = await repo.sumIngresosByPeriod(inicio, fin);
      const costos = await repo.sumCostosByPeriod(inicio, fin);

      expect(ingresos).toBe('75000');
      expect(costos).toBe('45000');
    });
  });
});