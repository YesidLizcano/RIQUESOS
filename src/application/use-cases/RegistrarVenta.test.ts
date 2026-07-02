import { describe, it, expect, vi } from 'vitest';
import { RegistrarVenta } from './RegistrarVenta';
import { Venta } from '../../domain/entities/Venta';
import { Lote } from '../../domain/entities/Lote';
import { Cliente } from '../../domain/entities/Cliente';
import { TipoProducto, TipoCliente, EstadoLote } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

describe('RegistrarVenta', () => {
  const mockVentaRepo: VentaRepository = {
    save: vi.fn(),
    findByDateRange: vi.fn(),
    findByCliente: vi.fn(),
    sumIngresosByPeriod: vi.fn(),
    sumCostosByPeriod: vi.fn(),
    registrarVentaAtomico: vi.fn(),
  };

  const mockLoteRepo: LoteRepository = {
    findById: vi.fn(),
    findActive: vi.fn(),
    findByProveedor: vi.fn(),
    save: vi.fn(),
    deductStock: vi.fn(),
    updateCosts: vi.fn(),
    delete: vi.fn(),
  };

  const mockClienteRepo: ClienteRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new RegistrarVenta(mockVentaRepo, mockLoteRepo, mockClienteRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const clienteMinorista = new Cliente({
    id: 'c-1',
    nombre: 'Minor Client',
    tipo: TipoCliente.MINORISTA,
  });

  const clienteMayorista = new Cliente({
    id: 'c-2',
    nombre: 'Mayor Client',
    tipo: TipoCliente.MAYORISTA,
    precioDobleCrema: '4500',
  });

  const loteActivo = new Lote({
    id: 'l-1',
    producto: TipoProducto.DOBLE_CREMA,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    stockDisponibleKg: '50',
    estado: EstadoLote.ACTIVO,
    version: 1,
  });

  it('should register a Venta for MINORISTA using standard price', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    const savedVenta = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue(savedVenta);

    const result = await useCase.execute({
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      standardPricePerKg: '5000',
    });

    expect(result.venta.clienteId).toBe('c-1');
    expect(result.venta.precioVentaKg.value).toBe('5000');
    expect(mockVentaRepo.registrarVentaAtomico).toHaveBeenCalled();
  });

  it('should register a Venta for MAYORISTA using custom price', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    const savedVenta = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '4500',
      costoAplicadoKg: '3000',
    });
    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue(savedVenta);

    const result = await useCase.execute({
      clienteId: 'c-2',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      standardPricePerKg: '5000',
    });

    expect(result.venta.precioVentaKg.value).toBe('4500');
  });

  it('should throw if cliente does not exist', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        clienteId: 'nonexistent',
        loteId: 'l-1',
        cantidadVendidaKg: '10',
        standardPricePerKg: '5000',
      })
    ).rejects.toThrow('Cliente not found: nonexistent');
  });

  it('should throw if lote does not exist', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        clienteId: 'c-1',
        loteId: 'nonexistent',
        cantidadVendidaKg: '10',
        standardPricePerKg: '5000',
      })
    ).rejects.toThrow('Lote not found: nonexistent');
  });

  it('should retry on ConcurrencyError and succeed', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    const savedVenta = new Venta({
      id: 'v-3',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });

    // First attempt fails with ConcurrencyError, second succeeds
    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new ConcurrencyError('version conflict'))
      .mockResolvedValue(savedVenta);

    const result = await useCase.execute({
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      standardPricePerKg: '5000',
    });

    expect(result.venta.id).toBe('v-3');
    expect(mockVentaRepo.registrarVentaAtomico).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries on persistent ConcurrencyError', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ConcurrencyError('persistent version conflict')
    );

    await expect(
      useCase.execute({
        clienteId: 'c-1',
        loteId: 'l-1',
        cantidadVendidaKg: '10',
        standardPricePerKg: '5000',
      })
    ).rejects.toThrow('persistent version conflict');
  });
});