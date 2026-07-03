import { describe, it, expect, vi } from 'vitest';
import { ModificarLote } from './ModificarLote';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

describe('ModificarLote', () => {
  const mockLoteRepo: LoteRepository = {
    findById: vi.fn(),
    findActive: vi.fn(),
    findAll: vi.fn(),
    findByProveedor: vi.fn(),
    save: vi.fn(),
    deductStock: vi.fn(),
    updateCosts: vi.fn(),
    updateBlocks: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    findAllIncludeDeleted: vi.fn(),
  };

  const useCase = new ModificarLote(mockLoteRepo);

  const baseLote = new Lote({
    id: 'lote-1',
    producto: TipoProducto.DOBLE_CREMA,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '5000',
    costoFlete: '50000',
    costoTajado: '10000',
    costoEmpaques: '5000',
    estado: EstadoLote.ACTIVO,
    version: 3,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update cost fields and persist with optimistic locking', async () => {
    const updatedLote = baseLote.updateCosts({ precioCompraBaseKg: '5500' });

    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(baseLote);
    (mockLoteRepo.updateCosts as ReturnType<typeof vi.fn>).mockResolvedValue(updatedLote);

    const result = await useCase.execute({
      id: 'lote-1',
      version: 3,
      precioCompraBaseKg: '5500',
    });

    expect(result).toBeDefined();
    expect(mockLoteRepo.findById).toHaveBeenCalledWith('lote-1');
    expect(mockLoteRepo.updateCosts).toHaveBeenCalledWith('lote-1', expect.any(Lote), 3);
  });

  it('should throw ConcurrencyError when version mismatch', async () => {
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Lote({
        ...baseLote,
        version: 5, // different version
      } as any)
    );

    await expect(
      useCase.execute({
        id: 'lote-1',
        version: 3,
        precioCompraBaseKg: '5500',
      })
    ).rejects.toThrow(ConcurrencyError);
  });

  it('should throw error when lote not found', async () => {
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'nonexistent',
        version: 1,
        precioCompraBaseKg: '5500',
      })
    ).rejects.toThrow('Lote not found: nonexistent');
  });

  it('should update multiple cost fields at once', async () => {
    const updatedLote = baseLote.updateCosts({
      costoFlete: '60000',
      costoTajado: '15000',
    });

    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(baseLote);
    (mockLoteRepo.updateCosts as ReturnType<typeof vi.fn>).mockResolvedValue(updatedLote);

    const result = await useCase.execute({
      id: 'lote-1',
      version: 3,
      costoFlete: '60000',
      costoTajado: '15000',
    });

    expect(result).toBeDefined();
    expect(mockLoteRepo.updateCosts).toHaveBeenCalledWith('lote-1', expect.any(Lote), 3);
  });
});