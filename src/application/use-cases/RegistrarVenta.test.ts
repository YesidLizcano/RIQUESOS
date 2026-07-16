import { describe, it, expect, vi } from 'vitest';
import { RegistrarVenta } from './RegistrarVenta';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { Lote } from '../../domain/entities/Lote';
import { Cliente } from '../../domain/entities/Cliente';
import { TipoProducto, TipoCliente, EstadoLote, OrigenCorte } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';

describe('RegistrarVenta (multi-item)', () => {
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
    softDelete: vi.fn(),
    restore: vi.fn(),
    findAllIncludeDeleted: vi.fn(),
    updateBlocks: vi.fn(),
  };

  const mockClienteRepo: ClienteRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findAll: vi.fn(),
    findActiveByNombre: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    findDeleted: vi.fn(),
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

  const useCase = new RegistrarVenta(mockVentaRepo, mockLoteRepo, mockClienteRepo, mockEmpaqueRepo, mockCompraInsumoRepo);

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
    precioDobleCremaEntero: '4500',
  });

  const loteActivo = new Lote({
    id: 'l-1',
    producto: TipoProducto.SEMISALADO,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    stockDisponibleKg: '50',
    estado: EstadoLote.ACTIVO,
    version: 1,
  });

  it('should register a single-item Venta for MINORISTA', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    const savedVenta = new Venta(
      { id: 'v-1', clienteId: 'c-1' },
      [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
    );
    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
      venta: savedVenta,
      items: [new VentaItem({ id: 'vi-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
    });

    const result = await useCase.execute({
      clienteId: 'c-1',
      items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
    });

    expect(result.venta.clienteId).toBe('c-1');
    expect(result.items).toHaveLength(1);
    expect(mockVentaRepo.registrarVentaAtomico).toHaveBeenCalled();
  });

  it('should register a multi-item Venta with items from different lotes', async () => {
    const lote2 = new Lote({
      id: 'l-2',
      producto: TipoProducto.SEMISALADO,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '80',
      precioCompraBaseKg: '4000',
      stockDisponibleKg: '40',
      estado: EstadoLote.ACTIVO,
      version: 1,
    });

    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>)
      .mockImplementation((id: string) => {
        if (id === 'l-1') return Promise.resolve(loteActivo);
        if (id === 'l-2') return Promise.resolve(lote2);
        return Promise.resolve(null);
      });

    const savedVenta = new Venta(
      { id: 'v-2', clienteId: 'c-1' },
      [
        new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' }),
        new VentaItem({ loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '6000', costoAplicadoKg: '4000' }),
      ]
    );

    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
      venta: savedVenta,
      items: [
        new VentaItem({ id: 'vi-1', ventaId: 'v-2', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' }),
        new VentaItem({ id: 'vi-2', ventaId: 'v-2', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '6000', costoAplicadoKg: '4000' }),
      ],
    });

    const result = await useCase.execute({
      clienteId: 'c-1',
      items: [
        { loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' },
        { loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '6000' },
      ],
    });

    expect(result.venta.clienteId).toBe('c-1');
    expect(result.items).toHaveLength(2);
    expect(result.venta.cantidadTotalKg.value).toBe('15');
  });

  it('should throw if cliente does not exist', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        clienteId: 'nonexistent',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
      })
    ).rejects.toThrow('Cliente not found: nonexistent');
  });

  it('should throw if lote does not exist', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        clienteId: 'c-1',
        items: [{ loteId: 'nonexistent', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
      })
    ).rejects.toThrow('Lote not found: nonexistent');
  });

  it('should throw if items array is empty', async () => {
    await expect(
      useCase.execute({
        clienteId: 'c-1',
        items: [],
      })
    ).rejects.toThrow('At least one item is required');
  });

  it('should retry on ConcurrencyError and succeed', async () => {
    (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
    (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

    const savedVenta = new Venta(
      { id: 'v-3', clienteId: 'c-1' },
      [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
    );

    (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new ConcurrencyError('version conflict'))
      .mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-1', ventaId: 'v-3', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

    const result = await useCase.execute({
      clienteId: 'c-1',
      items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
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
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
      })
    ).rejects.toThrow('persistent version conflict');
  });

  describe('DC block pricing — prices are per-BLOCK, not per-kg', () => {
    const clienteMayoristaDC = new Cliente({
      id: 'c-dc',
      nombre: 'DC Mayor Client',
      tipo: TipoCliente.MAYORISTA,
      precioDobleCremaEntero: '11250',  // $11,250 per block
      precioDobleCremaTajado: '10000',   // $10,000 per block
    });

    const loteDC = new Lote({
      id: 'l-dc',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-dc',
      cantidadCompradaKg: '100',
      precioCompraBaseKg: '3000',
      precioPorBloqueEntero: '7500',
      stockDisponibleKg: '50',
      bloquesEnteros: 20,
      bloquesTajadosDeFabrica: 10,
      estado: EstadoLote.ACTIVO,
      version: 1,
    });

    it('should convert per-BLOCK price to per-kg for enteros-only DC sale', async () => {
      // precioDobleCremaEntero = $11,250 per block
      // 2 enteros = 2 blocks × $11,250 = $22,500 income
      // 2 blocks × 2.5 kg = 5 kg
      // precioVentaKg = $22,500 / 5 kg = $4,500/kg
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayoristaDC);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);

      const savedVenta = new Venta(
        { id: 'v-dc1', clienteId: 'c-dc' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-dc1', ventaId: 'v-dc1', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })],
      });

      const result = await useCase.execute({
        clienteId: 'c-dc',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '5',
          precioVentaKg: '4500', // client sends average per-kg price
          bloquesEnterosVendidos: 2,
          bloquesTajadosVendidos: 0,
        }],
      });

      // Verify the use case computed the correct per-kg price from per-block prices
      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      const item = createdItems[0];
      // precioVentaKg = (2 × 11250) / 5 = 22500 / 5 = 4500
      expect(Number(item.precioVentaKg.value)).toBeCloseTo(4500, 0);
      // ingreso = precioVentaKg × cantidadKg = 4500 × 5 = 22500
      expect(Number(item.ingreso.value)).toBeCloseTo(22500, 0);
    });

    it('should convert per-BLOCK price to per-kg for tajados-only DC sale', async () => {
      // precioDobleCremaTajado = $10,000 per block
      // 3 tajados = 3 blocks × $10,000 = $30,000 income
      // 3 blocks × 2.5 kg = 7.5 kg
      // precioVentaKg = $30,000 / 7.5 kg = $4,000/kg
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayoristaDC);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);

      const savedVenta = new Venta(
        { id: 'v-dc2', clienteId: 'c-dc' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-dc2', ventaId: 'v-dc2', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4000', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        clienteId: 'c-dc',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '7.5',
          precioVentaKg: '4000',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 3,
        }],
      });

      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      const item = createdItems[0];
      // precioVentaKg = (3 × 10000) / 7.5 = 30000 / 7.5 = 4000
      expect(Number(item.precioVentaKg.value)).toBeCloseTo(4000, 0);
      // ingreso = 4000 × 7.5 = 30000
      expect(Number(item.ingreso.value)).toBeCloseTo(30000, 0);
    });

    it('should compute weighted per-kg price for mixed enteros + tajados DC sale', async () => {
      // 2 enteros × $11,250/block + 3 tajados × $10,000/block = $22,500 + $30,000 = $52,500 income
      // (2 + 3) blocks × 2.5 kg = 12.5 kg
      // precioVentaKg = $52,500 / 12.5 kg = $4,200/kg
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayoristaDC);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);

      const savedVenta = new Venta(
        { id: 'v-dc3', clienteId: 'c-dc' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-dc3', ventaId: 'v-dc3', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        clienteId: 'c-dc',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '12.5',
          precioVentaKg: '4200',
          bloquesEnterosVendidos: 2,
          bloquesTajadosVendidos: 3,
        }],
      });

      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      const item = createdItems[0];
      // precioVentaKg = (2×11250 + 3×10000) / 12.5 = 52500 / 12.5 = 4200
      expect(Number(item.precioVentaKg.value)).toBeCloseTo(4200, 0);
      // ingreso = 4200 × 12.5 = 52500
      expect(Number(item.ingreso.value)).toBeCloseTo(52500, 0);
    });

    it('should consume sueltosEntero first for ENTERO granel sale', async () => {
      const loteWithSueltos = new Lote({
        id: 'l-dc-entero-sueltos',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajadosDeFabrica: 10,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteWithSueltos);

      const savedVenta = new Venta(
        { id: 'v-entero-sueltos', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-entero-sueltos', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-entero-sueltos', ventaId: 'v-entero-sueltos', loteId: 'l-dc-entero-sueltos', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      // ENTERO granel sale: consumes 1.5kg sueltosEntero first, then breaks 1 block for remaining 1.5kg
      const result = await useCase.execute({
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-entero-sueltos',
          ventaTipo: 'GRANEL',
          cantidadKg: '3',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.ENTERO,
        }],
      });

      expect(result).toBeDefined();
      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      // Should break 1 block (1.5kg from sueltos + 2.5kg from block - 1.0kg surplus back to sueltos)
      expect(createdItems[0].bloquesEnterosVendidos).toBe(1);
      expect(createdItems[0].sueltosEnteroDelta).toBe('-0.5'); // -1.5 consumed + 1.0 surplus = -0.5
    });

    it('should reject ENTERO granel sale when insufficient blocks even with sueltos', async () => {
      const loteWithSueltos = new Lote({
        id: 'l-dc-entero-limited',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 0,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteWithSueltos);

      // Try to sell 3 kg ENTERO — only 1.5 kg sueltos and 0 blocks available
      await expect(useCase.execute({
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-entero-limited',
          ventaTipo: 'GRANEL',
          cantidadKg: '3',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.ENTERO,
        }],
      })).rejects.toThrow(/bloques enteros insuficientes/i);
    });

    it('should consume sueltosTajado first for TAJADO granel sale', async () => {
      const loteWithSueltos = new Lote({
        id: 'l-dc-tajado-sueltos',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajados: 5,
        bloquesTajadosDeFabrica: 10,
        sueltosEntero: '0.5',
        sueltosTajado: '2.0',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteWithSueltos);

      const savedVenta = new Venta(
        { id: 'v-tajado-sueltos', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-tajado-sueltos', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-tajado-sueltos', ventaId: 'v-tajado-sueltos', loteId: 'l-dc-tajado-sueltos', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      // TAJADO granel sale: consumes 2.0kg sueltosTajado first, then breaks 1 block for remaining 1.0kg
      const result = await useCase.execute({
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-tajado-sueltos',
          ventaTipo: 'GRANEL',
          cantidadKg: '3',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.TAJADO,
        }],
      });

      expect(result).toBeDefined();
      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      // Should break 1 block (2.0kg from sueltos + 2.5kg from block - 1.5kg surplus back to sueltos)
      expect(createdItems[0].bloquesTajadosVendidos).toBe(1);
      expect(createdItems[0].sueltosTajadoDelta).toBe('-0.5'); // -2.0 consumed + 1.5 surplus = -0.5
    });

    it('should NOT multiply per-block price by kg for enteros-only DC sale (regression)', async () => {
      // OLD BUG: income was kgEnteros × precioPerBlock = 5kg × 11250 = 56250 (WRONG)
      // CORRECT:  income = enteros × precioPerBlock = 2 × 11250 = 22500
      // This test verifies we get 22500, not the old buggy 56250
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayoristaDC);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);

      const savedVenta = new Venta(
        { id: 'v-dc4', clienteId: 'c-dc' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-dc4', ventaId: 'v-dc4', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        clienteId: 'c-dc',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '5',
          precioVentaKg: '4500',
          bloquesEnterosVendidos: 2,
          bloquesTajadosVendidos: 0,
        }],
      });

      const createdItems = (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0].items;
      const item = createdItems[0];
      // MUST be 22500 (2 blocks × $11,250), NOT 56250 (5 kg × $11,250)
      const ingreso = Number(item.ingreso.value);
      expect(ingreso).toBeCloseTo(22500, 0);
      expect(ingreso).not.toBeCloseTo(56250, 0);
    });
  });

  describe('metodoPagoAbono validation', () => {
    it('should create CREDITO venta with metodoPagoAbono when abono > 0', async () => {
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      const savedVenta = new Venta(
        { id: 'v-mpa-1', clienteId: 'c-1', metodoPago: 'CREDITO', metodoPagoAbono: 'EFECTIVO', abono: '10000' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-mpa-1', ventaId: 'v-mpa-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      const result = await useCase.execute({
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
        metodoPago: 'CREDITO',
        metodoPagoAbono: 'EFECTIVO',
        abono: '10000',
      });

      expect(result.venta.metodoPago).toBe('CREDITO');
      expect(result.venta.metodoPagoAbono).toBe('EFECTIVO');
      expect(result.venta.abono.value).toBe('10000');
    });

    it('should throw if CREDITO venta with abono > 0 but no metodoPagoAbono', async () => {
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      await expect(
        useCase.execute({
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
          metodoPago: 'CREDITO',
          abono: '10000',
        })
      ).rejects.toThrow('metodoPagoAbono is required when metodoPago is CREDITO and abono > 0');
    });

    it('should throw if metodoPagoAbono is CREDITO', async () => {
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      await expect(
        useCase.execute({
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
          metodoPago: 'CREDITO',
          metodoPagoAbono: 'CREDITO',
          abono: '10000',
        })
      ).rejects.toThrow(/metodoPagoAbono must be one of/);
    });

    it('should set metodoPagoAbono to null for non-CREDITO ventas', async () => {
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteActivo);

      const savedVenta = new Venta(
        { id: 'v-mpa-2', clienteId: 'c-1', metodoPago: 'EFECTIVO' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.registrarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: savedVenta,
        items: [new VentaItem({ id: 'vi-mpa-2', ventaId: 'v-mpa-2', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      const result = await useCase.execute({
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000' }],
        metodoPago: 'EFECTIVO',
        metodoPagoAbono: 'NEQUI', // should be ignored
      });

      expect(result.venta.metodoPagoAbono).toBeNull();
    });
  });
});