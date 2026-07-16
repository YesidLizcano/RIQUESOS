import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrarTajado } from './RegistrarTajado';
import { Tajado } from '../../domain/entities/Tajado';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote, CategoriaInsumo } from '../../domain/enums';
import { Empaque } from '../../domain/entities/Empaque';
import { CompraInsumo } from '../../domain/entities/CompraInsumo';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';

describe('RegistrarTajado', () => {
  const mockTajadoRepo: TajadoRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByLoteId: vi.fn(),
    findAll: vi.fn(),
    updateEstadoPago: vi.fn(),
    sumPendientePago: vi.fn(),
  };

  const mockLoteRepo: LoteRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
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
    sumCostoPendientePago: vi.fn(),
  };

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

  const useCase = new RegistrarTajado(mockTajadoRepo, mockLoteRepo, mockEmpaqueRepo, mockCompraInsumoRepo);

  const useCaseWithoutSeparadores = new RegistrarTajado(mockTajadoRepo, mockLoteRepo);

  const loteActivo = new Lote({
    id: 'l-1',
    producto: TipoProducto.DOBLE_CREMA,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    stockDisponibleKg: '100',
    estado: EstadoLote.ACTIVO,
    bloquesEnteros: 20,
    version: 1,
  });

  const separadorEmpaque = new Empaque({
    id: 'sep-1',
    tipo: 'Separador plástico',
    categoria: CategoriaInsumo.SEPARADOR,
    stock: '10',
    precio: '2000',
  });

  const separadorLot = new CompraInsumo({
    id: 'lot-1',
    empaqueId: 'sep-1',
    categoria: CategoriaInsumo.SEPARADOR,
    cantidad: '20',
    cantidadRestante: '10',
    precioUnitario: '2000',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic tajado registration', () => {
    it('should register a tajado without separadores', async () => {
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);
      (mockTajadoRepo.save as ReturnType<typeof vi.fn>).mockImplementation(
        async (tajado: Tajado) => tajado
      );
      (mockLoteRepo.updateBlocks as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      const result = await useCase.execute({
        loteId: 'l-1',
        cantidadBloques: 5,
        precioPorBloque: '1500',
        tajador: 'Carlos',
      });

      expect(result.tajado.loteId).toBe('l-1');
      expect(result.tajado.cantidadBloques).toBe(5);
      expect(result.tajado.separadoresKg.value).toBe('0');
      expect(result.tajado.costoSeparadores.value).toBe('0');
      expect(mockTajadoRepo.save).toHaveBeenCalled();
      expect(mockLoteRepo.updateBlocks).toHaveBeenCalled();
    });

    it('should register a tajado with separadoresKg and deduct FIFO', async () => {
      const updatedEmpaque = new Empaque({
        id: 'sep-1',
        tipo: 'Separador plástico',
        categoria: CategoriaInsumo.SEPARADOR,
        stock: '7.5',
        precio: '2000',
      });

      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([separadorEmpaque]);
      // DeductInsumoFIFO calls findById internally
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(separadorEmpaque);
      (mockCompraInsumoRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>).mockResolvedValue([separadorLot]);
      (mockCompraInsumoRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(separadorLot);
      (mockEmpaqueRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedEmpaque);
      (mockTajadoRepo.save as ReturnType<typeof vi.fn>).mockImplementation(
        async (tajado: Tajado) => tajado
      );
      (mockLoteRepo.updateBlocks as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      const result = await useCase.execute({
        loteId: 'l-1',
        cantidadBloques: 5,
        precioPorBloque: '1500',
        tajador: 'Carlos',
        separadoresKg: '2.5',
      });

      expect(result.tajado.separadoresKg.value).toBe('2.5');
      // costoSeparadores = precio per kg × kg used = 2000 × 2.5 = 5000
      expect(result.tajado.costoSeparadores.value).toBe('5000');
      expect(mockEmpaqueRepo.findByCategoria).toHaveBeenCalledWith(CategoriaInsumo.SEPARADOR);
      // Verify FIFO was called
      expect(mockEmpaqueRepo.findById).toHaveBeenCalledWith('sep-1');
      expect(mockCompraInsumoRepo.findActiveByEmpaqueId).toHaveBeenCalledWith('sep-1');
    });

    it('should throw if separadoresKg > 0 and no separadores in inventory', async () => {
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        useCase.execute({
          loteId: 'l-1',
          cantidadBloques: 5,
          precioPorBloque: '1500',
          tajador: 'Carlos',
          separadoresKg: '2',
        })
      ).rejects.toThrow('No hay separadores disponibles en inventario');
    });

    it('should throw if separadoresKg > 0 and insufficient stock', async () => {
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([separadorEmpaque]);

      await expect(
        useCase.execute({
          loteId: 'l-1',
          cantidadBloques: 5,
          precioPorBloque: '1500',
          tajador: 'Carlos',
          separadoresKg: '50',
        })
      ).rejects.toThrow(/Stock insuficiente de separadores/);
    });

    it('should throw if lote not found', async () => {
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase.execute({
          loteId: 'nonexistent',
          cantidadBloques: 5,
          precioPorBloque: '1500',
          tajador: 'Carlos',
        })
      ).rejects.toThrow('Lote not found: nonexistent');
    });

    it('should throw if lote is AGOTADO', async () => {
      const loteAgotado = new Lote({
        id: 'l-2',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '0',
        estado: EstadoLote.AGOTADO,
        bloquesEnteros: 0,
        version: 1,
      });

      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteAgotado);

      await expect(
        useCase.execute({
          loteId: 'l-2',
          cantidadBloques: 5,
          precioPorBloque: '1500',
          tajador: 'Carlos',
        })
      ).rejects.toThrow('No se puede registrar tajado en un lote agotado');
    });

    it('should throw if separadoresKg > 0 but repos not provided', async () => {
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      await expect(
        useCaseWithoutSeparadores.execute({
          loteId: 'l-1',
          cantidadBloques: 5,
          precioPorBloque: '1500',
          tajador: 'Carlos',
          separadoresKg: '2',
        })
      ).rejects.toThrow('EmpaqueRepository and CompraInsumoRepository are required when separadoresKg > 0');
    });
  });
});