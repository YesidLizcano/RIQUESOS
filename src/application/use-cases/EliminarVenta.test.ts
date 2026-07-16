import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EliminarVenta } from './EliminarVenta';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote, CategoriaInsumo } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import { Empaque } from '../../domain/entities/Empaque';

describe('EliminarVenta', () => {
  const mockVentaRepo: VentaRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByDateRange: vi.fn(),
    findByCliente: vi.fn(),
    sumIngresosByPeriod: vi.fn(),
    sumCostosByPeriod: vi.fn(),
    registrarVentaAtomico: vi.fn(),
    eliminarVentaAtomico: vi.fn(),
  };

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

  const useCase = new EliminarVenta(mockVentaRepo, mockLoteRepo, mockEmpaqueRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const loteActivo = new Lote({
    id: 'l-1',
    producto: TipoProducto.DOBLE_CREMA,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    stockDisponibleKg: '50',
    bloquesEnteros: 20,
    bloquesTajados: 5,
    bloquesTajadosDeFabrica: 2,
    estado: EstadoLote.ACTIVO,
    version: 1,
  });

  const loteSemisalado = new Lote({
    id: 'l-2',
    producto: TipoProducto.SEMISALADO,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '80',
    precioCompraBaseKg: '4000',
    stockDisponibleKg: '40',
    estado: EstadoLote.ACTIVO,
    version: 2,
  });

  it('should throw if venta not found', async () => {
    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ ventaId: 'nonexistent' })
    ).rejects.toThrow('Venta not found: nonexistent');
  });

  it('should throw if a lote is not found', async () => {
    const items = [
      new VentaItem({ id: 'vi-m', ventaId: 'v-m', loteId: 'l-missing', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' }),
    ];
    const venta = new Venta({ id: 'v-m', clienteId: 'c-1' }, items);

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ ventaId: 'v-1' })
    ).rejects.toThrow('Lote not found: l-missing');
  });

  it('should delete a single-item GRANEL venta successfully', async () => {
    const items = [
      new VentaItem({ id: 'vi-1', ventaId: 'v-1', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '4000' }),
    ];
    const venta = new Venta({ id: 'v-1', clienteId: 'c-1' }, items);

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
    (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await useCase.execute({ ventaId: 'v-1' });

    expect(mockVentaRepo.eliminarVentaAtomico).toHaveBeenCalledWith({
      ventaId: 'v-1',
      loteReversions: [
        {
          loteId: 'l-2',
          cantidadKg: '10',
          expectedVersion: 2,
          ventaTipo: 'GRANEL',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 0,
          bloquesTajadosDeFabricaVendidos: 0,
          bloquesTajadosInternosVendidos: 0,
          origenCorte: 'ENTERO',
          sueltosEnteroDelta: '0',
          sueltosTajadoDelta: '0',
        },
      ],
      empaqueReversions: [],
    });
  });

  it('should delete a BLOQUES venta with reempacados', async () => {
    const items = [
      new VentaItem({
        id: 'vi-2',
        ventaId: 'v-2',
        loteId: 'l-1',
        ventaTipo: 'BLOQUES',
        cantidadKg: '15',
        precioVentaKg: '4500',
        costoAplicadoKg: '3200',
        bloquesEnterosVendidos: 4,
        bloquesTajadosVendidos: 2,
        bloquesReempacados: 2,
        costoEmpaques: '1000',
      }),
    ];
    const venta = new Venta({ id: 'v-2', clienteId: 'c-2' }, items);

    const bolsaEmpaque = new Empaque({
      id: 'emp-1',
      tipo: 'Bolsa DC',
      categoria: CategoriaInsumo.BOLSA,
      stock: '50',
      precio: '500',
    });

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);
    (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsaEmpaque]);
    (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await useCase.execute({ ventaId: 'v-2' });

    expect(mockVentaRepo.eliminarVentaAtomico).toHaveBeenCalledWith({
      ventaId: 'v-2',
      loteReversions: [
        {
          loteId: 'l-1',
          cantidadKg: '15',
          expectedVersion: 1,
          ventaTipo: 'BLOQUES',
          bloquesEnterosVendidos: 4,
          bloquesTajadosVendidos: 2,
          bloquesTajadosDeFabricaVendidos: 0,
          bloquesTajadosInternosVendidos: 0,
          origenCorte: 'ENTERO',
          sueltosEnteroDelta: '0',
          sueltosTajadoDelta: '0',
        },
      ],
      empaqueReversions: [
        { empaqueId: 'emp-1', quantity: 2 },
      ],
    });
  });

  it('should handle multi-item venta with multiple lotes', async () => {
    const items = [
      new VentaItem({ id: 'vi-3', ventaId: 'v-3', loteId: 'l-1', ventaTipo: 'BLOQUES', cantidadKg: '10', precioVentaKg: '4500', costoAplicadoKg: '3200', bloquesEnterosVendidos: 2, bloquesTajadosVendidos: 2, bloquesReempacados: 0 }),
      new VentaItem({ id: 'vi-4', ventaId: 'v-3', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '6000', costoAplicadoKg: '4000' }),
    ];
    const venta = new Venta({ id: 'v-3', clienteId: 'c-1' }, items);

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>)
      .mockImplementation((id: string) => {
        if (id === 'l-1') return Promise.resolve(loteActivo);
        if (id === 'l-2') return Promise.resolve(loteSemisalado);
        return Promise.resolve(null);
      });
    (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await useCase.execute({ ventaId: 'v-3' });

    const callArgs = (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.ventaId).toBe('v-3');
    expect(callArgs.loteReversions).toHaveLength(2);
    expect(callArgs.empaqueReversions).toHaveLength(0);
  });

  it('should retry on ConcurrencyError and succeed', async () => {
    const items = [
      new VentaItem({ id: 'vi-5', ventaId: 'v-4', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '4000' }),
    ];
    const venta = new Venta({ id: 'v-4', clienteId: 'c-1' }, items);

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
    (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new ConcurrencyError('version conflict'))
      .mockResolvedValueOnce(undefined);

    await useCase.execute({ ventaId: 'v-4' });

    expect(mockVentaRepo.eliminarVentaAtomico).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries on persistent ConcurrencyError', async () => {
    const items = [
      new VentaItem({ id: 'vi-6', ventaId: 'v-5', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '4000' }),
    ];
    const venta = new Venta({ id: 'v-5', clienteId: 'c-1' }, items);

    (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta, items });
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
    (mockVentaRepo.eliminarVentaAtomico as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ConcurrencyError('persistent version conflict')
    );

    await expect(
      useCase.execute({ ventaId: 'v-5' })
    ).rejects.toThrow('persistent version conflict');

    // 3 retries = 3 calls to eliminarVentaAtomico
    expect(mockVentaRepo.eliminarVentaAtomico).toHaveBeenCalledTimes(3);
  });
});