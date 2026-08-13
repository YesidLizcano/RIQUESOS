import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditarVenta } from './EditarVenta';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { Lote } from '../../domain/entities/Lote';
import { Cliente } from '../../domain/entities/Cliente';
import { Empaque } from '../../domain/entities/Empaque';
import { TipoProducto, TipoCliente, EstadoLote, OrigenCorte, OrigenTajadoGranel, CategoriaInsumo } from '../../domain/enums';
import { ConcurrencyError } from '../../domain/errors/ConcurrencyError';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import type { PrecioClienteProveedorRepository } from '../../domain/ports/PrecioClienteProveedorRepository';

describe('EditarVenta', () => {
  const mockVentaRepo: VentaRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByDateRange: vi.fn(),
    findByCliente: vi.fn(),
    sumIngresosByPeriod: vi.fn(),
    sumCostosByPeriod: vi.fn(),
    registrarVentaAtomico: vi.fn(),
    eliminarVentaAtomico: vi.fn(),
    editarVentaAtomico: vi.fn(),
    updateAbono: vi.fn(),
    sumIngresoByMetodoPago: vi.fn(),
    sumCreditoAbonoByMetodoPagoAbono: vi.fn(),
    sumAbonoPagoByMetodoPago: vi.fn(),
    sumSaldoPendienteByFecha: vi.fn(),
    findCuentasPorCobrar: vi.fn(),
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
    softDelete: vi.fn(),
    restore: vi.fn(),
    findAllIncludeDeleted: vi.fn(),
    updateBlocks: vi.fn(),
    acumularRecortes: vi.fn(),
    cerrarLote: vi.fn(),
    sumCostoPendientePago: vi.fn(),
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

  const mockPrecioRepo: PrecioClienteProveedorRepository = {
    findByClienteAndProveedor: vi.fn(),
    findByCliente: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  const useCase = new EditarVenta(
    mockVentaRepo,
    mockLoteRepo,
    mockClienteRepo,
    mockEmpaqueRepo,
    mockCompraInsumoRepo,
    mockPrecioRepo,
  );

  const useCaseNoEmpaque = new EditarVenta(
    mockVentaRepo,
    mockLoteRepo,
    mockClienteRepo,
  );

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
    precioDobleCremaEntero: '11250',
    precioDobleCremaTajado: '10000',
  });

  const loteSemisalado = new Lote({
    id: 'l-1',
    producto: TipoProducto.SEMISALADO,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    stockDisponibleKg: '50',
    estado: EstadoLote.ACTIVO,
    version: 1,
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

  describe('happy path - simple SEMISALADO edit', () => {
    it('should edit a simple SEMISALADO GRANEL venta', async () => {
      const oldVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      const oldItem = new VentaItem({
        id: 'vi-old-1',
        ventaId: 'v-1',
        loteId: 'l-1',
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      const newItem = new VentaItem({
        id: 'vi-new-1',
        ventaId: 'v-1',
        loteId: 'l-1',
        ventaTipo: 'GRANEL',
        cantidadKg: '5',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [newItem],
      });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
      });

      expect(result.venta.clienteId).toBe('c-1');
      expect(result.items).toHaveLength(1);
      expect(mockVentaRepo.editarVentaAtomico).toHaveBeenCalledTimes(1);

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.oldVentaId).toBe('v-1');
      expect(callArgs.reversals).toHaveLength(1);
      expect(callArgs.reversals[0].loteId).toBe('l-1');
      expect(callArgs.reversals[0].cantidadKg).toBe('10');
      expect(callArgs.loteDeductions).toHaveLength(1);
      expect(callArgs.loteDeductions[0].loteId).toBe('l-1');
      expect(callArgs.loteDeductions[0].cantidadKg).toBe('5');
    });

    it('should pass correct reversal data from old items to editarVentaAtomico', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old-1',
        ventaId: 'v-1',
        loteId: 'l-1',
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesTajadosVendidos: 1,
        bloquesTajadosDeFabricaVendidos: 0,
        bloquesTajadosInternosVendidos: 1,
        origenCorte: OrigenCorte.ENTERO,
        sueltosEnteroDelta: '-0.5',
        sueltosTajadoDelta: '0',
      });
      const oldVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1' },
        [oldItem]
      );

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: oldVenta,
        items: [],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const reversal = callArgs.reversals[0];
      expect(reversal.bloquesEnterosVendidos).toBe(2);
      expect(reversal.bloquesTajadosVendidos).toBe(1);
      expect(reversal.bloquesTajadosDeFabricaVendidos).toBe(0);
      expect(reversal.bloquesTajadosInternosVendidos).toBe(1);
      expect(reversal.origenCorte).toBe(OrigenCorte.ENTERO);
      expect(reversal.sueltosEnteroDelta).toBe('-0.5');
      expect(reversal.sueltosTajadoDelta).toBe('0');
    });
  });

  describe('validation errors', () => {
    it('should throw if venta not found', async () => {
      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase.execute({
          ventaId: 'nonexistent',
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('Venta not found: nonexistent');
    });

    it('should throw if items array is empty', async () => {
      const oldVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      const oldItem = new VentaItem({
        id: 'vi-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [],
        })
      ).rejects.toThrow('At least one item is required');
    });

    it('should throw if cliente not found', async () => {
      const oldVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      const oldItem = new VentaItem({
        id: 'vi-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'nonexistent',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('Cliente not found: nonexistent');
    });

    it('should throw if lote not found for old item reversal', async () => {
      const oldItem = new VentaItem({
        id: 'vi-1', ventaId: 'v-1', loteId: 'l-missing', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-missing', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('Lote not found: l-missing');
    });

    it('should throw if lote not found for new item', async () => {
      const oldItem = new VentaItem({
        id: 'vi-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>)
        .mockImplementation((id: string) => {
          if (id === 'l-1') return Promise.resolve(loteSemisalado);
          return Promise.resolve(null);
        });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-nonexistent', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('Lote not found: l-nonexistent');
    });

    it('should throw if DC BLOQUES block count does not match kg', async () => {
      const oldItem = new VentaItem({
        id: 'vi-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesTajadosVendidos: 1,
          }],
        })
      ).rejects.toThrow(/no coincide con los kg vendidos/);
    });
  });

  describe('DC GRANEL edit', () => {
    it('should edit a DC GRANEL ENTERO venta with sueltos calculation', async () => {
      const loteWithSueltos = new Lote({
        id: 'l-dc-s',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajadosDeFabrica: 10,
        sueltosEntero: '1.5',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc-s',
        ventaTipo: 'GRANEL',
        cantidadKg: '3',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
        origenCorte: OrigenCorte.ENTERO,
        bloquesEnterosVendidos: 1,
        sueltosEnteroDelta: '-0.5',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteWithSueltos);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-s', ventaTipo: 'GRANEL', cantidadKg: '4', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      const newItem = new VentaItem({
        id: 'vi-new',
        ventaId: 'v-1',
        loteId: 'l-dc-s',
        ventaTipo: 'GRANEL',
        cantidadKg: '4',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [newItem],
      });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-s',
          ventaTipo: 'GRANEL',
          cantidadKg: '4',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.ENTERO,
        }],
      });

      expect(result).toBeDefined();
      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];

      expect(callArgs.reversals[0].loteId).toBe('l-dc-s');
      expect(callArgs.reversals[0].cantidadKg).toBe('3');

      const newDeduction = callArgs.loteDeductions[0];
      expect(newDeduction.cantidadKg).toBe('4');
      expect(newDeduction.origenCorte).toBe(OrigenCorte.ENTERO);
    });

    it('should edit a DC GRANEL TAJADO venta with origenTajadoGranel', async () => {
      const loteWithSueltos = new Lote({
        id: 'l-dc-t',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajados: 5,
        bloquesTajadosDeFabrica: 10,
        sueltosTajado: '2.0',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc-t',
        ventaTipo: 'GRANEL',
        cantidadKg: '3',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
        origenCorte: OrigenCorte.TAJADO,
        origenTajadoGranel: OrigenTajadoGranel.INTERNO,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteWithSueltos);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-t', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-1', loteId: 'l-dc-t', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-t',
          ventaTipo: 'GRANEL',
          cantidadKg: '5',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.TAJADO,
          origenTajadoGranel: OrigenTajadoGranel.FABRICA,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const newDeduction = callArgs.loteDeductions[0];
      expect(newDeduction.origenCorte).toBe(OrigenCorte.TAJADO);
    });

    it('should use costoTajadoFabricaKg when origenTajadoGranel is FABRICA', async () => {
      const loteDC = new Lote({
        id: 'l-dc-tf',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        precioPorBloqueEntero: '7500',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajados: 5,
        bloquesTajadosDeFabrica: 10,
        sueltosTajado: '2.0',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc-tf',
        ventaTipo: 'GRANEL',
        cantidadKg: '3',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
        origenCorte: OrigenCorte.TAJADO,
        origenTajadoGranel: OrigenTajadoGranel.INTERNO,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-tf', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-1', loteId: 'l-dc-tf', ventaTipo: 'GRANEL', cantidadKg: '3', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-tf',
          ventaTipo: 'GRANEL',
          cantidadKg: '3',
          precioVentaKg: '5000',
          origenCorte: OrigenCorte.TAJADO,
          origenTajadoGranel: OrigenTajadoGranel.FABRICA,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const newItem = callArgs.newItems[0];
      expect(Number(newItem.costoAplicadoKg.value)).toBeCloseTo(Number(loteDC.costoTajadoFabricaKg.value), 0);
    });
  });

  describe('DC BLOQUES pricing edit', () => {
    const loteDCBlocks = new Lote({
      id: 'l-dc-b',
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

    it('should compute correct per-kg price from per-block price for enteros-only DC edit', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc-b',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesTajadosVendidos: 0,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-dc' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-b', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc-b', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4000', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-b',
          ventaTipo: 'BLOQUES',
          cantidadKg: '7.5',
          precioVentaKg: '4000',
          bloquesEnterosVendidos: 0,
          bloquesTajadosVendidos: 3,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const newItem = callArgs.newItems[0];
      expect(Number(newItem.precioVentaKg.value)).toBeCloseTo(4000, 0);
      expect(Number(newItem.ingreso.value)).toBeCloseTo(30000, 0);
    });

    it('should compute weighted per-kg price for mixed enteros + tajados DC edit', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc-b',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesTajadosVendidos: 0,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-b', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc-b', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-b',
          ventaTipo: 'BLOQUES',
          cantidadKg: '12.5',
          precioVentaKg: '4200',
          bloquesEnterosVendidos: 2,
          bloquesTajadosVendidos: 3,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const newItem = callArgs.newItems[0];
      expect(Number(newItem.precioVentaKg.value)).toBeCloseTo(4200, 0);
      expect(Number(newItem.ingreso.value)).toBeCloseTo(52500, 0);
    });
  });

  describe('CREDITO venta edit', () => {
    it('should edit a CREDITO venta with metodoPagoAbono', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-1',
        ventaTipo: 'GRANEL',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1', metodoPago: 'CREDITO', metodoPagoAbono: 'EFECTIVO', abono: '10000' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        metodoPago: 'CREDITO',
        metodoPagoAbono: 'EFECTIVO',
        abono: '10000',
      });

      expect(result.venta.metodoPago).toBe('CREDITO');
      expect(result.venta.metodoPagoAbono).toBe('EFECTIVO');
      expect(result.venta.abono.value).toBe('10000');
    });

    it('should throw if CREDITO venta with abono > 0 but no metodoPagoAbono', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
          metodoPago: 'CREDITO',
          abono: '10000',
        })
      ).rejects.toThrow('metodoPagoAbono is required when metodoPago is CREDITO and abono > 0');
    });

    it('should throw if metodoPagoAbono is CREDITO', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
          metodoPago: 'CREDITO',
          metodoPagoAbono: 'CREDITO',
          abono: '10000',
        })
      ).rejects.toThrow(/metodoPagoAbono must be one of/);
    });

    it('should set metodoPagoAbono to null for non-CREDITO edit', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-1', clienteId: 'c-1', metodoPago: 'EFECTIVO' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        metodoPago: 'EFECTIVO',
        metodoPagoAbono: 'NEQUI',
      });

      expect(result.venta.metodoPagoAbono).toBeNull();
    });
  });

  describe('concurrency and retry', () => {
    it('should retry on ConcurrencyError and succeed', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new ConcurrencyError('version conflict'))
        .mockResolvedValue({
          venta: newVenta,
          items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
        });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
      });

      expect(result.venta.id).toBe('v-new');
      expect(mockVentaRepo.editarVentaAtomico).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries on persistent ConcurrencyError', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ConcurrencyError('persistent version conflict')
      );

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('persistent version conflict');
    });

    it('should throw immediately on non-concurrency errors', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-1',
          items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        })
      ).rejects.toThrow('Database connection error');

      expect(mockVentaRepo.editarVentaAtomico).toHaveBeenCalledTimes(1);
    });

    it('should retry on error with "modified by another transaction" message', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Record was modified by another transaction'))
        .mockResolvedValue({
          venta: newVenta,
          items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
        });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
      });

      expect(result.venta.id).toBe('v-new');
      expect(mockVentaRepo.editarVentaAtomico).toHaveBeenCalledTimes(2);
    });
  });

  describe('empaque FIFO reversal', () => {
    it('should reverse empaque deductions from old items and deduct new empaques', async () => {
      const bolsaEmpaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa DC',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '200',
      });

      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesReempacados: 3,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      const loteDCWithBlocks = new Lote({
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

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCWithBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsaEmpaque]);
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(bolsaEmpaque);
      (mockCompraInsumoRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '5',
          precioVentaKg: '4500',
          bloquesEnterosVendidos: 2,
          bloquesReempacados: 2,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.empaqueReversions).toHaveLength(1);
      expect(callArgs.empaqueReversions[0].empaqueId).toBe('emp-1');
      expect(callArgs.empaqueReversions[0].quantity).toBe(3);
      expect(callArgs.empaqueDeductions).toHaveLength(1);
      expect(callArgs.empaqueDeductions[0].empaqueId).toBe('emp-1');
      expect(callArgs.empaqueDeductions[0].quantity).toBe(2);
    });

    it('should throw if empaque stock insufficient for reempacados', async () => {
      const bolsaEmpaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa DC',
        categoria: CategoriaInsumo.BOLSA,
        stock: '1',
        precio: '200',
      });

      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesReempacados: 2,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      const loteDCWithBlocks = new Lote({
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

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCWithBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsaEmpaque]);
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(bolsaEmpaque);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesReempacados: 5,
          }],
        })
      ).rejects.toThrow(/Stock insuficiente de empaques/);
    });

    it('should throw if empaqueRepo not provided when bloquesReempacados > 0', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old',
        ventaId: 'v-1',
        loteId: 'l-dc',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesReempacados: 2,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      const loteDCWithBlocks = new Lote({
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

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCWithBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCaseNoEmpaque.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesReempacados: 3,
          }],
        })
      ).rejects.toThrow('EmpaqueRepository and CompraInsumoRepository are required when bloquesReempacados > 0');
    });
  });

  describe('multi-item edit', () => {
    it('should handle editing a venta with items from different lotes', async () => {
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

      const oldItem1 = new VentaItem({
        id: 'vi-old-1', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem1]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem1] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
        if (id === 'l-1') return Promise.resolve(loteSemisalado);
        if (id === 'l-2') return Promise.resolve(lote2);
        return Promise.resolve(null);
      });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-1' },
        [
          new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' }),
          new VentaItem({ loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '8', precioVentaKg: '6000', costoAplicadoKg: '4000' }),
        ]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [
          new VentaItem({ id: 'vi-new-1', ventaId: 'v-new', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' }),
          new VentaItem({ id: 'vi-new-2', ventaId: 'v-new', loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '8', precioVentaKg: '6000', costoAplicadoKg: '4000' }),
        ],
      });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [
          { loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' },
          { loteId: 'l-2', ventaTipo: 'GRANEL', cantidadKg: '8', precioVentaKg: '6000' },
        ],
      });

      expect(result.items).toHaveLength(2);
      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.reversals).toHaveLength(1);
      expect(callArgs.reversals[0].loteId).toBe('l-1');
      expect(callArgs.loteDeductions).toHaveLength(2);
    });

    it('should aggregate empaque reversals from multiple old items', async () => {
      const bolsaEmpaque = new Empaque({
        id: 'emp-1',
        tipo: 'Bolsa DC',
        categoria: CategoriaInsumo.BOLSA,
        stock: '100',
        precio: '200',
      });

      const loteDCWithBlocks = new Lote({
        id: 'l-dc',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '200',
        precioCompraBaseKg: '3000',
        precioPorBloqueEntero: '7500',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 20,
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem1 = new VentaItem({
        id: 'vi-old-1',
        ventaId: 'v-1',
        loteId: 'l-dc',
        ventaTipo: 'BLOQUES',
        cantidadKg: '5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
        bloquesReempacados: 3,
      });
      const oldItem2 = new VentaItem({
        id: 'vi-old-2',
        ventaId: 'v-1',
        loteId: 'l-dc',
        ventaTipo: 'BLOQUES',
        cantidadKg: '2.5',
        precioVentaKg: '4500',
        costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 1,
        bloquesReempacados: 2,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem1, oldItem2]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem1, oldItem2] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCWithBlocks);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);
      (mockEmpaqueRepo.findByCategoria as ReturnType<typeof vi.fn>).mockResolvedValue([bolsaEmpaque]);
      (mockEmpaqueRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(bolsaEmpaque);
      (mockCompraInsumoRepo.findActiveByEmpaqueId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4500', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '7.5', precioVentaKg: '4500', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '7.5',
          precioVentaKg: '4500',
          bloquesEnterosVendidos: 3,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.empaqueReversions).toHaveLength(1);
      expect(callArgs.empaqueReversions[0].quantity).toBe(5);
    });
  });

  describe('DC BLOQUES tajados validation', () => {
    it('should reject when tajados split sum does not match total', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '12.5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesTajadosVendidos: 3,
            bloquesTajadosDeFabricaVendidos: 1,
            bloquesTajadosInternosVendidos: 1,
          }],
        })
      ).rejects.toThrow(/La suma de tajados de fábrica/);
    });

    it('should reject when bloquesTajadosDeFabricaVendidos exceeds available', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      // loteDC has bloquesTajadosDeFabrica=10, bloquesTajados=0
      // bloquesTajadosDeFabricaVendidos=15 > 10 (available), but sum must match: 15+0=15≠3
      // Use total tajados = 15 so sum validation passes, then availability check fails
      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '42.5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesTajadosVendidos: 15,
            bloquesTajadosDeFabricaVendidos: 15,
            bloquesTajadosInternosVendidos: 0,
          }],
        })
      ).rejects.toThrow(/Bloques tajados de fábrica insuficientes/);
    });

    it('should reject when bloquesTajadosInternosVendidos exceeds available', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc',
            ventaTipo: 'BLOQUES',
            cantidadKg: '12.5',
            precioVentaKg: '4500',
            bloquesEnterosVendidos: 2,
            bloquesTajadosVendidos: 3,
            bloquesTajadosDeFabricaVendidos: 0,
            bloquesTajadosInternosVendidos: 3,
          }],
        })
      ).rejects.toThrow(/Bloques tajados internos insuficientes/);
    });
  });

  describe('precio memory (PrecioClienteProveedor)', () => {
    it('should upsert precio memory for MAYORISTA DC BLOQUES edit with precioEntero', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDC);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000' })],
      });
      (mockPrecioRepo.findByClienteAndProveedor as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrecioRepo.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({} as any);
      (mockClienteRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue({} as any);

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc',
          ventaTipo: 'BLOQUES',
          cantidadKg: '5',
          precioVentaKg: '4500',
          bloquesEnterosVendidos: 2,
          precioEnteroBloque: '12000',
        }],
      });

      expect(mockPrecioRepo.upsert).toHaveBeenCalled();
    });

    it('should save domicilio memory to cliente when valorDomicilio provided', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteSemisalado);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-1', valorDomicilio: '5000' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
      });
      (mockClienteRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue({} as any);

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
        valorDomicilio: '5000',
      });

      expect(mockClienteRepo.save).toHaveBeenCalled();
      const savedCliente = (mockClienteRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedCliente.valorDomicilio.value).toBe('5000');
    });
  });

  describe('DC GRANEL block validation', () => {
    it('should reject ENTERO granel when insufficient bloques enteros', async () => {
      const loteLimited = new Lote({
        id: 'l-dc-limited',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 0,
        sueltosEntero: '1.5',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc-limited', ventaTipo: 'GRANEL', cantidadKg: '1', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteLimited);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc-limited',
            ventaTipo: 'GRANEL',
            cantidadKg: '3',
            precioVentaKg: '5000',
            origenCorte: OrigenCorte.ENTERO,
          }],
        })
      ).rejects.toThrow(/bloques enteros insuficientes/i);
    });

    it('should reject TAJADO granel when insufficient bloques tajados', async () => {
      const loteLimited = new Lote({
        id: 'l-dc-limited-t',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajados: 0,
        bloquesTajadosDeFabrica: 0,
        sueltosTajado: '0.5',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc-limited-t', ventaTipo: 'GRANEL', cantidadKg: '1', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteLimited);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      await expect(
        useCase.execute({
          ventaId: 'v-1',
          clienteId: 'c-2',
          items: [{
            loteId: 'l-dc-limited-t',
            ventaTipo: 'GRANEL',
            cantidadKg: '3',
            precioVentaKg: '5000',
            origenCorte: OrigenCorte.TAJADO,
          }],
        })
      ).rejects.toThrow(/bloques tajados insuficientes/i);
    });
  });

  describe('lote version refresh on retry', () => {
    it('should re-fetch lote versions on each retry attempt', async () => {
      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000',
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-1' }, [oldItem]);

      const loteV1 = new Lote({
        id: 'l-1',
        producto: TipoProducto.SEMISALADO,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        estado: EstadoLote.ACTIVO,
        version: 1,
      });
      const loteV2 = new Lote({
        id: 'l-1',
        producto: TipoProducto.SEMISALADO,
        proveedorId: 'prov-1',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        stockDisponibleKg: '50',
        estado: EstadoLote.ACTIVO,
        version: 2,
      });

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMinorista);
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteV1);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-1' },
        [new VentaItem({ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })]
      );

      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new ConcurrencyError('version conflict'))
        .mockImplementation(() => {
          (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteV2);
          return Promise.resolve({
            venta: newVenta,
            items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' })],
          });
        });

      const result = await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-1',
        items: [{ loteId: 'l-1', ventaTipo: 'GRANEL', cantidadKg: '5', precioVentaKg: '5000' }],
      });

      expect(result).toBeDefined();
      expect(mockVentaRepo.editarVentaAtomico).toHaveBeenCalledTimes(2);
    });
  });

  describe('costo calculation for DC BLOQUES edit', () => {
    it('should calculate weighted costo for mixed enteros/tajados DC BLOQUES', async () => {
      const loteDCWithTajados = new Lote({
        id: 'l-dc-mix',
        producto: TipoProducto.DOBLE_CREMA,
        proveedorId: 'prov-dc',
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        precioPorBloqueEntero: '7500',
        precioPorBloqueTajado: '7000',
        stockDisponibleKg: '50',
        bloquesEnteros: 20,
        bloquesTajados: 5,
        bloquesTajadosDeFabrica: 10,
        estado: EstadoLote.ACTIVO,
        version: 1,
      });

      const oldItem = new VentaItem({
        id: 'vi-old', ventaId: 'v-1', loteId: 'l-dc-mix', ventaTipo: 'BLOQUES', cantidadKg: '5', precioVentaKg: '4500', costoAplicadoKg: '3000',
        bloquesEnterosVendidos: 2,
      });
      const oldVenta = new Venta({ id: 'v-1', clienteId: 'c-2' }, [oldItem]);

      (mockVentaRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ venta: oldVenta, items: [oldItem] });
      (mockLoteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(loteDCWithTajados);
      (mockClienteRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(clienteMayorista);

      const newVenta = new Venta(
        { id: 'v-new', clienteId: 'c-2' },
        [new VentaItem({ loteId: 'l-dc-mix', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })]
      );
      (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mockResolvedValue({
        venta: newVenta,
        items: [new VentaItem({ id: 'vi-new', ventaId: 'v-new', loteId: 'l-dc-mix', ventaTipo: 'BLOQUES', cantidadKg: '12.5', precioVentaKg: '4200', costoAplicadoKg: '3000' })],
      });

      await useCase.execute({
        ventaId: 'v-1',
        clienteId: 'c-2',
        items: [{
          loteId: 'l-dc-mix',
          ventaTipo: 'BLOQUES',
          cantidadKg: '12.5',
          precioVentaKg: '4200',
          bloquesEnterosVendidos: 2,
          bloquesTajadosVendidos: 3,
          bloquesTajadosDeFabricaVendidos: 1,
          bloquesTajadosInternosVendidos: 2,
        }],
      });

      const callArgs = (mockVentaRepo.editarVentaAtomico as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const newItem = callArgs.newItems[0];
      expect(newItem.costoAplicado).toBeDefined();
      expect(Number(newItem.costoAplicadoKg.value)).toBeGreaterThan(0);
      expect(newItem.bloquesTajadosDeFabricaVendidos).toBe(1);
      expect(newItem.bloquesTajadosInternosVendidos).toBe(2);
    });
  });
});