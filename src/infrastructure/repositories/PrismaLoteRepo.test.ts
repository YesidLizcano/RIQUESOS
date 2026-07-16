import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../infrastructure/db';
import { PrismaLoteRepo } from '../../infrastructure/repositories/PrismaLoteRepo';
import { Lote } from '../../domain/entities/Lote';
import { EstadoLote, TipoProducto } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';

describe('PrismaLoteRepo — Integration', () => {
  let repo: PrismaLoteRepo;

  beforeAll(async () => {
    repo = new PrismaLoteRepo();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean test data — use raw SQL with FK checks disabled for reliable cleanup
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    await prisma.$executeRawUnsafe('DELETE FROM AbonoPago');
    await prisma.$executeRawUnsafe('DELETE FROM Venta');
    await prisma.$executeRawUnsafe('DELETE FROM Lote');
    await prisma.$executeRawUnsafe('DELETE FROM Cliente');
    await prisma.$executeRawUnsafe('DELETE FROM Usuario');
    await prisma.$executeRawUnsafe('DELETE FROM Proveedor');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  });

  describe('save and findById', () => {
    it('should persist a new Lote and retrieve it', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        costoFlete: '5000',
        costoTajado: '2000',
        costoEmpaques: '1000',
      });

      const saved = await repo.save(lote);

      expect(saved.id).toBeTruthy();
      expect(saved.producto).toBe(TipoProducto.DOBLE_CREMA);
      // Costo_Entero_Por_Kg = (3000 × 100 + 5000) / 100 = 3050
      // tajado (2000) is NOT included in costoRealCalculadoKg
      expect(saved.costoRealCalculadoKg.value).toBe('3050');
      expect(saved.stockDisponibleKg.value).toBe('100');
      expect(saved.estado).toBe(EstadoLote.ACTIVO);

      // Verify retrieval
      const found = await repo.findById(saved.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(saved.id);
    });

    it('should update an existing Lote', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });

      const saved = await repo.save(lote);

      // Update the lote
      const updated = new Lote({
        id: saved.id,
        producto: TipoProducto.SEMISALADO,
        proveedorId: proveedor.id,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
        stockDisponibleKg: '25',
        estado: EstadoLote.ACTIVO,
        version: saved.version,
      });

      const result = await repo.save(updated);
      expect(result.stockDisponibleKg.value).toBe('25');
    });
  });

  describe('findActive', () => {
    it('should return only ACTIVO lotes', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      await prisma.lote.create({
        data: {
          producto: TipoProducto.DOBLE_CREMA,
          proveedorId: proveedor.id,
          cantidadCompradaKg: 100,
          precioCompraBaseKg: 3000,
          precioPorBloqueEntero: 7500,
          precioPorBloqueTajado: 7500,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3000,
          stockDisponibleKg: 50,
          bloquesEnteros: 20,
          bloquesTajados: 0,
          bloquesTajadosDeFabrica: 0,
          estado: EstadoLote.ACTIVO,
        },
      });

      await prisma.lote.create({
        data: {
          producto: TipoProducto.SEMISALADO,
          proveedorId: proveedor.id,
          cantidadCompradaKg: 30,
          precioCompraBaseKg: 3500,
          precioPorBloqueEntero: 0,
          precioPorBloqueTajado: 0,
          costoFlete: 0,
          costoTajado: 0,
          costoEmpaques: 0,
          costoRealCalculadoKg: 3500,
          stockDisponibleKg: 0,
          bloquesEnteros: 0,
          bloquesTajados: 0,
          bloquesTajadosDeFabrica: 0,
          estado: EstadoLote.AGOTADO,
        },
      });

      const active = await repo.findActive();
      expect(active.length).toBe(1);
      expect(active[0].estado).toBe(EstadoLote.ACTIVO);
    });
  });

  describe('deductStock — optimistic locking', () => {
    it('should deduct stock with correct version', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '100',
      });
      const saved = await repo.save(lote);

      // After save, fetch the actual DB version
      const dbLote = await repo.findById(saved.id);
      expect(dbLote).not.toBeNull();

      const result = await repo.deductStock(saved.id, '25', dbLote!.version);
      expect(result.stockDisponibleKg.value).toBe('75');
    });

    it('should throw ConcurrencyError when version mismatches', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '100',
      });
      const saved = await repo.save(lote);

      // Try with wrong version (999 when DB has 1)
      try {
        await repo.deductStock(saved.id, '25', 999);
        expect.unreachable('Should have thrown ConcurrencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConcurrencyError);
      }
    });

    it('should transition to AGOTADO when stock reaches zero', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '10',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '10',
      });
      const saved = await repo.save(lote);
      const dbLote = await repo.findById(saved.id);

      const result = await repo.deductStock(saved.id, '10', dbLote!.version);
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should throw error for insufficient stock', async () => {
      const proveedor = await prisma.proveedor.create({
        data: { nombre: 'Test Proveedor' },
      });

      const lote = new Lote({
        proveedorId: proveedor.id,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '10',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '10',
      });
      const saved = await repo.save(lote);
      const dbLote = await repo.findById(saved.id);

      await expect(repo.deductStock(saved.id, '50', dbLote!.version)).rejects.toThrow(
        'Insufficient stock'
      );
    });
  });
});