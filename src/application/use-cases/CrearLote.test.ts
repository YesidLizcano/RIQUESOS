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

  const mockProveedorRepo: ProveedorRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    findDeleted: vi.fn(),
  };

  const useCase = new CrearLote(mockLoteRepo, mockProveedorRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a Doble Crema Lote with bloques and cost calculation', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
    (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

    // 40 bloques enteros = 100 kg
    // precioPorBloque = 7500 → precioCompraBaseKg = 7500 / 2.5 = 3000
    const result = await useCase.execute({
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '0', // Ignored for DC when bloques provided
      precioCompraBaseKg: '0', // Ignored for DC — derived from precioPorBloque
      precioPorBloque: '7500',
      costoFlete: '50000',
      costoEmpaques: '10000',
      bloquesEnteros: 40,
      bloquesTajadosDeFabrica: 0,
    });

    // precioCompraBaseKg = 7500 / 2.5 = 3000
    // (3000 × 100 + 50000 + 0 + 10000) / 100 = 3600
    expect(result.lote.costoRealCalculadoKg.value).toBe('3600');
    expect(result.lote.precioPorBloque.value).toBe('7500');
    expect(result.lote.precioCompraBaseKg.value).toBe('3000');
    expect(result.lote.cantidadCompradaKg.value).toBe('100');
    expect(result.lote.bloquesEnteros).toBe(40);
    expect(result.lote.bloquesTajados).toBe(0);
    expect(result.lote.bloquesTajadosDeFabrica).toBe(0);
    expect(result.lote.producto).toBe(TipoProducto.DOBLE_CREMA);
    expect(result.lote.estado).toBe(EstadoLote.ACTIVO);
    expect(mockLoteRepo.save).toHaveBeenCalledOnce();
  });

  it('should create a Doble Crema Lote with both bloquesEnteros and bloquesTajadosDeFabrica', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
    (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

    // 10 enteros + 2 de fábrica = 12 bloques = 30 kg
    const result = await useCase.execute({
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '0',
      precioCompraBaseKg: '0',
      precioPorBloque: '5000',
      bloquesEnteros: 10,
      bloquesTajadosDeFabrica: 2,
    });

    expect(result.lote.cantidadCompradaKg.value).toBe('30');
    expect(result.lote.precioCompraBaseKg.value).toBe('2000'); // 5000 / 2.5
    expect(result.lote.precioPorBloque.value).toBe('5000');
    expect(result.lote.bloquesEnteros).toBe(10);
    expect(result.lote.bloquesTajadosDeFabrica).toBe(2);
    expect(result.lote.bloquesTajados).toBe(0);
  });

  it('should create a Semisalado Lote with cantidad in Kg', async () => {
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
    expect(result.lote.bloquesEnteros).toBe(0);
    expect(result.lote.bloquesTajados).toBe(0);
    expect(result.lote.bloquesTajadosDeFabrica).toBe(0);
    expect(result.lote.precioPorBloque.value).toBe('0'); // Semisalado has no precioPorBloque
  });

  it('should throw if proveedor does not exist', async () => {
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'nonexistent',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '0',
        precioPorBloque: '7500',
        bloquesEnteros: 40,
      })
    ).rejects.toThrow('Proveedor not found: nonexistent');
  });

  it('should throw if Doble Crema has zero bloques', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

    await expect(
      useCase.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        precioPorBloque: '7500',
        bloquesEnteros: 0,
        bloquesTajadosDeFabrica: 0,
      })
    ).rejects.toThrow('Para Doble Crema, debe ingresar al menos un bloque');
  });

  it('should throw if Semisalado has zero cantidadCompradaKg', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

    await expect(
      useCase.execute({
        producto: TipoProducto.SEMISALADO,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '3000',
      })
    ).rejects.toThrow('Para Semisalado, la cantidad en Kg es obligatoria');
  });
});