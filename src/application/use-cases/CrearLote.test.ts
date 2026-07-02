import { describe, it, expect, vi } from 'vitest';
import { CrearLote } from './CrearLote';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import { Proveedor } from '../../domain/entities/Proveedor';

describe('CrearLote', () => {
  // Mock repos
  const mockLoteRepo: LoteRepository = {
    findById: vi.fn(),
    findActive: vi.fn(),
    findByProveedor: vi.fn(),
    save: vi.fn(),
    deductStock: vi.fn(),
    updateCosts: vi.fn(),
    delete: vi.fn(),
  };

  const mockProveedorRepo: ProveedorRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new CrearLote(mockLoteRepo, mockProveedorRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a Lote with cost calculation', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
    (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

    const result = await useCase.execute({
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '100',
      precioCompraBaseKg: '3000',
      costoFlete: '50000',
      costoTajado: '20000',
      costoEmpaques: '10000',
    });

    expect(result.lote.costoRealCalculadoKg.value).toBe('3800');
    expect(result.lote.producto).toBe(TipoProducto.DOBLE_CREMA);
    expect(result.lote.estado).toBe(EstadoLote.ACTIVO);
    expect(mockLoteRepo.save).toHaveBeenCalledOnce();
  });

  it('should create a Lote with zero optional costs', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
    (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

    const result = await useCase.execute({
      producto: TipoProducto.SEMISALADO,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '50',
      precioCompraBaseKg: '4000',
    });

    // (4000 × 50 + 0 + 0 + 0) / 50 = 4000
    expect(result.lote.costoRealCalculadoKg.value).toBe('4000');
  });

  it('should throw if proveedor does not exist', async () => {
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'nonexistent',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
      })
    ).rejects.toThrow('Proveedor not found: nonexistent');
  });

  it('should throw if quantity is zero', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

    await expect(
      useCase.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '3000',
      })
    ).rejects.toThrow('Lote cantidadCompradaKg cannot be zero');
  });
});