import { describe, it, expect, vi } from 'vitest';
import { CrearLote } from './CrearLote';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import { Proveedor } from '../../domain/entities/Proveedor';
import { Empaque } from '../../domain/entities/Empaque';
import { CompraInsumo } from '../../domain/entities/CompraInsumo';
import { Dinero } from '../../domain/value-objects/Dinero';
import { CategoriaInsumo } from '../../domain/enums';

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
    findActiveByNombre: vi.fn(),
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
    // precioPorBloqueEntero = 7500 → precioCompraBaseKg = 7500 / 2.5 = 3000
    const result = await useCase.execute({
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '0', // Ignored for DC when bloques provided
      precioCompraBaseKg: '0', // Ignored for DC — derived from precioPorBloqueEntero
      precioPorBloqueEntero: '7500',
      costoFlete: '50000',
      costoEmpaques: '10000',
      bloquesEnteros: 40,
      bloquesTajadosDeFabrica: 0,
    });

    // precioCompraBaseKg = 7500 / 2.5 = 3000
    // (3000 × 100 + 50000 + 0) / 100 = 3500  (empaques excluded from formula)
    expect(result.lote.costoRealCalculadoKg.value).toBe('3500');
    expect(result.lote.precioPorBloqueEntero.value).toBe('7500');
    expect(result.lote.precioPorBloqueTajado.value).toBe('0'); // no tajados, no price
    expect(result.lote.precioCompraBaseKg.value).toBe('3000');
    expect(result.lote.cantidadCompradaKg.value).toBe('100');
    expect(result.lote.bloquesEnteros).toBe(40);
    expect(result.lote.bloquesTajados).toBe(0);
    expect(result.lote.bloquesTajadosDeFabrica).toBe(0);
    expect(result.lote.bloquesEnterosReempacados).toBe(0);
    expect(result.lote.bloquesTajadosFabricaReempacados).toBe(0);
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
      precioPorBloqueEntero: '5000',
      precioPorBloqueTajado: '5000',
      bloquesEnteros: 10,
      bloquesTajadosDeFabrica: 2,
    });

    expect(result.lote.cantidadCompradaKg.value).toBe('30');
    expect(result.lote.precioCompraBaseKg.value).toBe('2000'); // 5000 / 2.5
    expect(result.lote.precioPorBloqueEntero.value).toBe('5000');
    expect(result.lote.precioPorBloqueTajado.value).toBe('5000');
    expect(result.lote.bloquesEnteros).toBe(10);
    expect(result.lote.bloquesTajadosDeFabrica).toBe(2);
    expect(result.lote.bloquesTajados).toBe(0);
  });

  it('should create a Doble Crema Lote with separate tajado block price', async () => {
    const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
    (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

    const result = await useCase.execute({
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '0',
      precioCompraBaseKg: '0',
      precioPorBloqueEntero: '7500',
      precioPorBloqueTajado: '8000',
      bloquesEnteros: 40,
      bloquesTajadosDeFabrica: 0,
    });

    expect(result.lote.precioPorBloqueEntero.value).toBe('7500');
    expect(result.lote.precioPorBloqueTajado.value).toBe('8000');
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
    expect(result.lote.precioPorBloqueEntero.value).toBe('0'); // Semisalado has no block prices
    expect(result.lote.precioPorBloqueTajado.value).toBe('0');
  });

  it('should throw if proveedor does not exist', async () => {
    (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'nonexistent',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '0',
        precioPorBloqueEntero: '7500',
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
        precioPorBloqueEntero: '7500',
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

  describe('bloquesReempacados (split into enteros and tajadosFabrica)', () => {
    const mockEmpaqueRepo: EmpaqueRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCategoria: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      findAllIncludeDeleted: vi.fn(),
    };

    const mockCompraInsumoRepo: CompraInsumoRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findByDateRange: vi.fn(),
      findAll: vi.fn(),
      findByEmpaqueId: vi.fn(),
      findActiveByEmpaqueId: vi.fn(),
    };

    const useCaseWithEmpaques = new CrearLote(mockLoteRepo, mockProveedorRepo, mockEmpaqueRepo, mockCompraInsumoRepo);

    it('should create a DC Lote with reempacados and deduct bolsa via FIFO', async () => {
      const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
      (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

      const bolsa = new Empaque({
        id: 'bolsa-1',
        tipo: 'Bolsa DC',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '500',
      });
      const bolsaLot = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'bolsa-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '500',
      });
      const deductedLot = bolsaLot.deduct('5');

      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsa]);
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(bolsa);
      (mockCompraInsumoRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([bolsaLot])
        .mockResolvedValueOnce([deductedLot]);
      (mockCompraInsumoRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(deductedLot);
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(bolsa.deduct('5'));

      const result = await useCaseWithEmpaques.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        precioPorBloqueEntero: '5000',
        precioPorBloqueTajado: '5000',
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 5,
        bloquesEnterosReempacados: 3,
        bloquesTajadosFabricaReempacados: 2,
      });

      expect(result.lote.bloquesEnterosReempacados).toBe(3);
      expect(result.lote.bloquesTajadosFabricaReempacados).toBe(2);
      expect(result.lote.costoEmpaques.value).not.toBe('0');
      expect(mockEmpaqueRepo.findByCategoria).toHaveBeenCalledWith(CategoriaInsumo.BOLSA);
    });

    it('should throw if bloquesEnterosReempacados exceeds bloquesEnteros', async () => {
      const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

      await expect(
        useCaseWithEmpaques.execute({
          producto: TipoProducto.DOBLE_CREMA,
          proveedorId: 'prov-1',
          cantidadCompradaKg: '0',
          precioCompraBaseKg: '0',
          precioPorBloqueEntero: '5000',
          bloquesEnteros: 10,
          bloquesTajadosDeFabrica: 2,
          bloquesEnterosReempacados: 11,
        })
      ).rejects.toThrow('bloquesEnterosReempacados (11) cannot exceed bloquesEnteros (10)');
    });

    it('should throw if bloquesTajadosFabricaReempacados exceeds bloquesTajadosDeFabrica', async () => {
      const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

      await expect(
        useCaseWithEmpaques.execute({
          producto: TipoProducto.DOBLE_CREMA,
          proveedorId: 'prov-1',
          cantidadCompradaKg: '0',
          precioCompraBaseKg: '0',
          precioPorBloqueEntero: '5000',
          bloquesEnteros: 10,
          bloquesTajadosDeFabrica: 2,
          bloquesTajadosFabricaReempacados: 3,
        })
      ).rejects.toThrow('bloquesTajadosFabricaReempacados (3) cannot exceed bloquesTajadosDeFabrica (2)');
    });

    it('should allow reempacados up to their respective block counts', async () => {
      const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);
      (mockLoteRepo.save as ReturnType<typeof vi.fn>).mockImplementation(async (lote: Lote) => lote);

      const bolsa = new Empaque({
        id: 'bolsa-1',
        tipo: 'Bolsa DC',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '500',
      });
      const bolsaLot = new CompraInsumo({
        id: 'lot-1',
        empaqueId: 'bolsa-1',
        categoria: CategoriaInsumo.BOLSA,
        cantidad: '100',
        cantidadRestante: '100',
        precioUnitario: '500',
      });
      const deductedLot = bolsaLot.deduct('12');

      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsa]);
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(bolsa);
      (mockCompraInsumoRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([bolsaLot])
        .mockResolvedValueOnce([deductedLot]);
      (mockCompraInsumoRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(deductedLot);
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(bolsa.deduct('12'));

      const result = await useCaseWithEmpaques.execute({
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        precioPorBloqueEntero: '5000',
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 2,
        bloquesEnterosReempacados: 10,
        bloquesTajadosFabricaReempacados: 2,
      });

      expect(result.lote.bloquesEnterosReempacados).toBe(10);
      expect(result.lote.bloquesTajadosFabricaReempacados).toBe(2);
    });

    it('should throw if empaque repos not provided when reempacados > 0', async () => {
      const proveedor = new Proveedor({ id: 'prov-1', nombre: 'Quesos SA' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(proveedor);

      await expect(
        useCase.execute({
          producto: TipoProducto.DOBLE_CREMA,
          proveedorId: 'prov-1',
          cantidadCompradaKg: '0',
          precioCompraBaseKg: '0',
          precioPorBloqueEntero: '5000',
          precioPorBloqueTajado: '5000',
          bloquesEnteros: 10,
          bloquesTajadosDeFabrica: 5,
          bloquesEnterosReempacados: 3,
        })
      ).rejects.toThrow('EmpaqueRepository and CompraInsumoRepository are required when bloquesEnterosReempacados or bloquesTajadosFabricaReempacados > 0');
    });
  });
});