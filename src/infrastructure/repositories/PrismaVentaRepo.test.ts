import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../infrastructure/db';
import { PrismaVentaRepo } from '../../infrastructure/repositories/PrismaVentaRepo';
import { Venta } from '../../domain/entities/Venta';
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
    // Clean test data — disable FK checks for reliable cleanup, then re-enable
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    await prisma.$executeRawUnsafe('DELETE FROM Venta');
    await prisma.$executeRawUnsafe('DELETE FROM Lote');
    await prisma.$executeRawUnsafe('DELETE FROM GastoFijo');
    await prisma.$executeRawUnsafe('DELETE FROM Cliente');
    await prisma.$executeRawUnsafe('DELETE FROM Usuario');
    await prisma.$executeRawUnsafe('DELETE FROM Proveedor');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  });

  describe('registrarVentaAtomico', () => {
    it('should register a Venta and deduct stock atomically', async () => {
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
          stockDisponibleKg: 100,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const venta = new Venta({
        clienteId: cliente.id,
        loteId: lote.id,
        cantidadVendidaKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      const result = await repo.registrarVentaAtomico(venta, lote.id, '10', 1);

      expect(result.clienteId).toBe(cliente.id);
      expect(result.loteId).toBe(lote.id);
      expect(result.cantidadVendidaKg.value).toBe('10');
      expect(result.ingresoTotal.value).toBe('50000');
      expect(result.costoAplicado.value).toBe('30000');
      expect(result.gananciaBruta.value).toBe('20000');

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

      const venta = new Venta({
        clienteId: cliente.id,
        loteId: lote.id,
        cantidadVendidaKg: '50',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      await expect(
        repo.registrarVentaAtomico(venta, lote.id, '50', 1)
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw ConcurrencyError when version mismatches', async () => {
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
          stockDisponibleKg: 100,
          estado: 'ACTIVO',
          version: 1,
        },
      });

      const cliente = await prisma.cliente.create({
        data: { nombre: 'Test Client', tipo: 'MINORISTA' },
      });

      const venta = new Venta({
        clienteId: cliente.id,
        loteId: lote.id,
        cantidadVendidaKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      // Use wrong version (0 when DB has 1)
      try {
        await repo.registrarVentaAtomico(venta, lote.id, '10', 0);
        expect.unreachable('Should have thrown ConcurrencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConcurrencyError);
      }
    });

    it('should transition Lote to AGOTADO when stock reaches zero', async () => {
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

      const venta = new Venta({
        clienteId: cliente.id,
        loteId: lote.id,
        cantidadVendidaKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      await repo.registrarVentaAtomico(venta, lote.id, '10', 1);

      const updatedLote = await prisma.lote.findUnique({ where: { id: lote.id } });
      expect(updatedLote!.stockDisponibleKg.toString()).toBe('0');
      expect(updatedLote!.estado).toBe('AGOTADO');
    });
  });

  describe('findByDateRange', () => {
    it('should return Ventas within date range', async () => {
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

      await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          loteId: lote.id,
          cantidadVendidaKg: 10,
          precioVentaKg: 5000,
          ingresoTotal: 50000,
          costoAplicado: 30000,
          gananciaBruta: 20000,
          valorDomicilio: 0,
          domiciliario: '',
          fecha: new Date('2026-06-15'),
        },
      });

      const inicio = new Date('2026-06-01');
      const fin = new Date('2026-06-30');

      const ventas = await repo.findByDateRange(inicio, fin);
      expect(ventas.length).toBe(1);
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
          loteId: lote.id,
          cantidadVendidaKg: 10,
          precioVentaKg: 5000,
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
          loteId: lote.id,
          cantidadVendidaKg: 5,
          precioVentaKg: 5000,
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