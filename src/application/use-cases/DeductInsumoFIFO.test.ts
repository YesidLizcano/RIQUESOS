import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeductInsumoFIFO } from './DeductInsumoFIFO';
import { CompraInsumo } from '../../domain/entities/CompraInsumo';
import { Empaque } from '../../domain/entities/Empaque';
import { CategoriaInsumo } from '../../domain/enums';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';

describe('DeductInsumoFIFO', () => {
  let mockCompraRepo: CompraInsumoRepository;
  let mockEmpaqueRepo: EmpaqueRepository;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCompraRepo = {
      save: vi.fn(),
      update: vi.fn(),
      findByDateRange: vi.fn(),
      findAll: vi.fn(),
      findByEmpaqueId: vi.fn(),
      findActiveByEmpaqueId: vi.fn(),
    };

    mockEmpaqueRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCategoria: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      findAllIncludeDeleted: vi.fn(),
    };
  });

  const useCase = () => new DeductInsumoFIFO(mockCompraRepo, mockEmpaqueRepo);

  describe('single lot deduction', () => {
    it('should deduct from a single lot', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '500',
      });

      const lot = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        precioUnitario: '500',
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([lot]) // before update
        .mockResolvedValueOnce([lot.deduct('30')]); // after update for price
      (mockCompraRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(lot.deduct('30'));
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);

      const result = await useCase().execute({
        empaqueId: 'emp-1',
        cantidad: '30',
      });

      // Total cost = 30 × 500 = 15000
      expect(result.totalCost).toBe('15000');
      expect(result.pricePerUnit).toBe('500');
      expect(mockCompraRepo.update).toHaveBeenCalled();
      expect(mockEmpaqueRepo.update).toHaveBeenCalled();
    });
  });

  describe('multiple lots (FIFO)', () => {
    it('should deduct across lots starting from oldest', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '150',
        precio: '500',
      });

      const oldLot = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '50',
        precioUnitario: '500',
        fecha: new Date('2025-01-01'),
      });

      const newLot = new CompraInsumo({
        id: 'lot-2',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '600',
        fecha: new Date('2025-02-01'),
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([oldLot, newLot]) // before update
        .mockResolvedValueOnce([newLot.deduct('30')]); // after: old lot exhausted, new lot has 70 left

      const deductedOldLot = oldLot.deduct('50'); // exhausts old lot
      const deductedNewLot = newLot.deduct('30'); // takes 30 from new lot
      (mockCompraRepo.update as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(deductedOldLot)
        .mockResolvedValueOnce(deductedNewLot);
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);

      const result = await useCase().execute({
        empaqueId: 'emp-1',
        cantidad: '80',
      });

      // 50 × 500 (old lot) + 30 × 600 (new lot) = 25000 + 18000 = 43000
      expect(result.totalCost).toBe('43000');
      // Price per unit should be from the now-active lot (the new one)
      expect(result.pricePerUnit).toBe('600');

      // Both lots should have been updated
      expect(mockCompraRepo.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('lot exhaustion', () => {
    it('should move to next lot when first is depleted', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '200',
        precio: '400',
      });

      const lot1 = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '50',
        cantidadRestante: '10',
        precioUnitario: '400',
        fecha: new Date('2025-01-01'),
      });

      const lot2 = new CompraInsumo({
        id: 'lot-2',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '500',
        fecha: new Date('2025-02-01'),
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([lot1, lot2])
        .mockResolvedValueOnce([lot2.deduct('15')]); // lot1 exhausted, lot2 has 85 left

      (mockCompraRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);

      const result = await useCase().execute({
        empaqueId: 'emp-1',
        cantidad: '25',
      });

      // 10 × 400 (lot1) + 15 × 500 (lot2) = 4000 + 7500 = 11500
      expect(result.totalCost).toBe('11500');
      expect(result.pricePerUnit).toBe('500'); // active lot is now lot2
    });
  });

  describe('price update after deduction', () => {
    it('should update empaque precio to reflect active lot after deduction', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '200',
        precio: '400', // currently shows old lot price
      });

      const oldLot = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '10',
        precioUnitario: '400',
        fecha: new Date('2025-01-01'),
      });

      const newLot = new CompraInsumo({
        id: 'lot-2',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '550',
        fecha: new Date('2025-02-01'),
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      // After deducting 10 from old lot, old lot is exhausted, so active = newLot
      const deductedOld = oldLot.deduct('10');
      const deductedNew = newLot.deduct('0'); // no deduction from new lot since we only took 10

      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([oldLot, newLot])
        .mockResolvedValueOnce([newLot]); // old lot is exhausted

      (mockCompraRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await useCase().execute({
        empaqueId: 'emp-1',
        cantidad: '10',
      });

      expect(result.pricePerUnit).toBe('550'); // now active lot's price
    });
  });

  describe('error cases', () => {
    it('should throw if empaque not found', async () => {
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase().execute({ empaqueId: 'nonexistent', cantidad: '10' })
      ).rejects.toThrow('Insumo no encontrado: nonexistent');
    });

    it('should throw if insufficient total stock', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '5',
        precio: '500',
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);

      await expect(
        useCase().execute({ empaqueId: 'emp-1', cantidad: '10' })
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should create implicit lot when no active lots exist but empaque has stock', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '500',
      });

      const implicitLot = new CompraInsumo({
        id: 'lot-implicit',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '500',
      });

      const deductedLot = new CompraInsumo({
        id: 'lot-implicit',
        empaqueId: 'emp-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '90',
        precioUnitario: '500',
      });

      const deductedEmpaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '90',
        precio: '500',
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // first call: no lots -> triggers implicit lot creation
        .mockResolvedValueOnce([deductedLot]); // second call: after deduction, for price update
      (mockCompraRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue(implicitLot);
      (mockCompraRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(deductedLot);
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(deductedEmpaque);

      const result = await useCase().execute({ empaqueId: 'emp-1', cantidad: '10' });

      expect(result.totalCost).toBe('5000'); // 10 * 500
      expect(mockCompraRepo.save).toHaveBeenCalled(); // implicit lot created
    });

    it('should throw if no stock and no lots exist', async () => {
      const empaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa',
        categoria: CategoriaInsumo.BOLSA,
        stock: '0',
        precio: '500',
      });

      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(empaque);
      (mockCompraRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        useCase().execute({ empaqueId: 'emp-1', cantidad: '10' })
      ).rejects.toThrow('Stock insuficiente');
    });
  });
});