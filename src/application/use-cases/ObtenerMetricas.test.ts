import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObtenerMetricas } from './ObtenerMetricas';
import { Venta } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { Lote } from '../../domain/entities/Lote';
import { Cliente } from '../../domain/entities/Cliente';
import { Proveedor } from '../../domain/entities/Proveedor';
import { TipoProducto, TipoCliente, EstadoLote } from '../../domain/enums';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

import type { ClienteRepository } from '../../domain/ports/ClienteRepository';
import type { VentaItemRepository } from '../../domain/ports/VentaItemRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import type { TajadoRepository } from '../../domain/ports/TajadoRepository';

describe('ObtenerMetricas', () => {
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

  const mockVentaItemRepo: VentaItemRepository = {
    findByVentaId: vi.fn(),
    findByVentaIds: vi.fn(),
    save: vi.fn(),
    saveMany: vi.fn(),
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

  const mockTajadoRepo: TajadoRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByLoteId: vi.fn(),
    findAll: vi.fn(),
    updateEstadoPago: vi.fn(),
    sumPendientePago: vi.fn(),
  };

  const useCase = new ObtenerMetricas(mockVentaRepo, mockLoteRepo, mockClienteRepo, mockVentaItemRepo, mockProveedorRepo, mockTajadoRepo);

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaItemRepo.findByVentaIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockLoteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '0', count: 0 });
    (mockTajadoRepo.sumPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue('0');
  });

  const inicio = new Date('2026-06-01');
  const fin = new Date('2026-06-30');

  // Helper to create a Venta with items for testing
  function createTestVenta(id: string, clienteId: string, items: Array<{ loteId: string; cantidadKg: string; precioVentaKg: string; costoAplicadoKg: string }>, fecha?: Date, valorDomicilio?: string): Venta {
    const ventaItems = items.map((item) => new VentaItem({
      loteId: item.loteId,
      ventaTipo: 'GRANEL',
      cantidadKg: item.cantidadKg,
      precioVentaKg: item.precioVentaKg,
      costoAplicadoKg: item.costoAplicadoKg,
    }));
    return new Venta({
      id,
      clienteId,
      fecha,
      valorDomicilio,
    }, ventaItems);
  }

  it('should compute financial metrics for a period', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('80000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('48000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ingresoTotal).toBe('80000');
    expect(result.periodo.costoMercancia).toBe('48000');
    expect(result.periodo.gananciaBruta).toBe('32000');
  });

  it('should return zero metrics when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ingresoTotal).toBe('0');
    expect(result.periodo.costoMercancia).toBe('0');
    expect(result.periodo.gananciaBruta).toBe('0');
  });



  it('should aggregate inventory by product type for ACTIVO lotes', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const lote1 = new Lote({
      id: 'l-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '50',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
    });
    const lote2 = new Lote({
      id: 'l-2',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-2',
      cantidadCompradaKg: '30',
      precioCompraBaseKg: '3500',
      stockDisponibleKg: '30',
      estado: EstadoLote.ACTIVO,
    });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote1, lote2]);

    const result = await useCase.execute(inicio, fin);

    const dobleCrema = result.inventario.find((i) => i.producto === TipoProducto.DOBLE_CREMA);
    expect(dobleCrema).toBeDefined();
    expect(dobleCrema!.stockDisponibleKg).toBe('80');
    expect(dobleCrema!.lotesActivos).toBe(2);
  });

  it('should compute inventory value from active lotes', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const lote1 = new Lote({
      id: 'l-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '50',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
    });
    const lote2 = new Lote({
      id: 'l-2',
      producto: TipoProducto.SEMISALADO,
      proveedorId: 'prov-2',
      cantidadCompradaKg: '30',
      precioCompraBaseKg: '3500',
      stockDisponibleKg: '30',
      estado: EstadoLote.ACTIVO,
    });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote1, lote2]);

    const result = await useCase.execute(inicio, fin);

    expect(result.inventarioResumen.valorTotal).toBe('255000');
    expect(result.inventarioResumen.lotesActivos).toBe(2);
  });

  it('should compute ventasCount, clientesActivos, and kgVendidos from sales', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    const venta3 = createTestVenta('v-3', 'c-1', [
      { loteId: 'l-1', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA }),
    ]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ventasCount).toBe(3);
    expect(result.periodo.clientesActivos).toBe(2);
    expect(result.periodo.kgVendidos).toBe('30');
  });

  it('should compute gross margin percentage', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.margenBrutoPct).not.toBe('N/A');
    expect(Number(result.periodo.margenBrutoPct)).toBeCloseTo(40, 0);
  });

  it('should return N/A margins when revenue is zero', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.margenBrutoPct).toBe('N/A');
  });

  it('should use findByIds for batch client resolution (N+1 fix)', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    const cliente1 = new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA });
    const cliente2 = new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA });
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([cliente1, cliente2]);

    const result = await useCase.execute(inicio, fin, 5);

    expect(mockClienteRepo.findByIds).toHaveBeenCalled();
    expect(mockClienteRepo.findById).not.toHaveBeenCalled();
    expect(result.topClientes.length).toBe(2);
    expect(result.topClientes[0].nombre).toBe('Client B');
    expect(result.topClientes[1].nombre).toBe('Client A');
  });

  it('should rank top clients by revenue', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // venta1: c-1, ingreso = 10*5000 = 50000
    // venta2: c-2, ingreso = 15*4000 = 60000
    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    const cliente1 = new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA });
    const cliente2 = new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA });
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([cliente1, cliente2]);

    const result = await useCase.execute(inicio, fin, 5);

    expect(result.topClientes.length).toBeLessThanOrEqual(5);
    expect(result.topClientes[0].clienteId).toBe('c-2');
  });

  it('should compute ventasDiarias grouping by date and filling gaps', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ], new Date(2026, 5, 5));
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-1', cantidadKg: '5', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ], new Date(2026, 5, 5));
    const venta3 = createTestVenta('v-3', 'c-1', [
      { loteId: 'l-1', cantidadKg: '8', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ], new Date(2026, 5, 7));
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MAYORISTA }),
    ]);

    const result = await useCase.execute(new Date(2026, 5, 1), new Date(2026, 5, 10, 23, 59, 59, 999));

    expect(result.ventasDiarias).toHaveLength(10);
    expect(result.ventasDiarias[0].fecha).toBe('2026-06-01');
    expect(result.ventasDiarias[0].total).toBe('0');

    // June 5: venta1 (10*5000=50000) + venta2 (5*4000=20000) = 70000
    const june5 = result.ventasDiarias.find((vd) => vd.fecha === '2026-06-05');
    expect(june5).toBeDefined();
    expect(Number(june5!.total)).toBeCloseTo(70000, 0);

    const june6 = result.ventasDiarias.find((vd) => vd.fecha === '2026-06-06');
    expect(june6).toBeDefined();
    expect(june6!.total).toBe('0');

    // June 7: venta3 (8*5000=40000)
    const june7 = result.ventasDiarias.find((vd) => vd.fecha === '2026-06-07');
    expect(june7).toBeDefined();
    expect(Number(june7!.total)).toBeCloseTo(40000, 0);
  });

  it('should compute ingresosPorTipoCliente grouping by client type', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('55000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    const venta3 = createTestVenta('v-3', 'c-1', [
      { loteId: 'l-1', cantidadKg: '5', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);

    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MAYORISTA }),
    ]);

    const result = await useCase.execute(inicio, fin);

    expect(result.ingresosPorTipoCliente).toHaveLength(2);

    const minorista = result.ingresosPorTipoCliente.find((itc) => itc.tipo === 'MINORISTA');
    expect(minorista).toBeDefined();
    expect(Number(minorista!.total)).toBeCloseTo(75000, 0);

    const mayorista = result.ingresosPorTipoCliente.find((itc) => itc.tipo === 'MAYORISTA');
    expect(mayorista).toBeDefined();
    expect(Number(mayorista!.total)).toBeCloseTo(60000, 0);
  });

  it('should return empty ventasDiarias with zeros when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(new Date(2026, 5, 1), new Date(2026, 5, 3, 23, 59, 59, 999));

    expect(result.ventasDiarias).toHaveLength(3);
    expect(result.ventasDiarias.every((vd) => vd.total === '0')).toBe(true);
  });

  it('should return empty ingresosPorTipoCliente when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.ingresosPorTipoCliente).toHaveLength(0);
  });

  it('should return empty desglosePorProducto and desglosePorProveedor when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.desglosePorProducto).toHaveLength(0);
    expect(result.desglosePorProveedor).toHaveLength(0);
  });

  it('should compute desglosePorProducto grouping items by product type', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('55000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // venta1 has a Doble Crema item (lote l-1), venta2 has a Semisalado item (lote l-2)
    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    // Create VentaItem instances directly for the mock
    const item1 = new VentaItem({
      id: 'vi-1',
      ventaId: 'v-1',
      loteId: 'l-1',
      ventaTipo: 'GRANEL',
      cantidadKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
      ingreso: '50000',
      costoAplicado: '30000',
      costoEmpaques: '0',
    });
    const item2 = new VentaItem({
      id: 'vi-2',
      ventaId: 'v-2',
      loteId: 'l-2',
      ventaTipo: 'GRANEL',
      cantidadKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
      ingreso: '60000',
      costoAplicado: '37500',
      costoEmpaques: '0',
    });
    (mockVentaItemRepo.findByVentaIds as ReturnType<typeof vi.fn>).mockResolvedValue([item1, item2]);

    // Lot l-1 is Doble Crema from proveedor p-1, lot l-2 is Semisalado from proveedor p-2
    const lote1 = new Lote({
      id: 'l-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'p-1',
      cantidadCompradaKg: '100',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
    });
    const lote2 = new Lote({
      id: 'l-2',
      producto: TipoProducto.SEMISALADO,
      proveedorId: 'p-2',
      cantidadCompradaKg: '80',
      precioCompraBaseKg: '2500',
      stockDisponibleKg: '30',
      estado: EstadoLote.ACTIVO,
    });
    (mockLoteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([lote1, lote2]);

    const prov1 = new Proveedor({ id: 'p-1', nombre: 'Proveedor Alpha' });
    const prov2 = new Proveedor({ id: 'p-2', nombre: 'Proveedor Beta' });
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([prov1, prov2]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    // Desglose por Producto
    expect(result.desglosePorProducto).toHaveLength(2);

    const dc = result.desglosePorProducto.find((d) => d.producto === TipoProducto.DOBLE_CREMA);
    expect(dc).toBeDefined();
    expect(Number(dc!.ingreso)).toBeCloseTo(50000, 0);
    expect(dc!.ventasCount).toBe(1);

    const ss = result.desglosePorProducto.find((d) => d.producto === TipoProducto.SEMISALADO);
    expect(ss).toBeDefined();
    expect(Number(ss!.ingreso)).toBeCloseTo(60000, 0);
    expect(ss!.ventasCount).toBe(1);
  });

  it('should compute desglosePorProveedor grouping items by proveedor', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('55000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Two ventas, both from same proveedor p-1 but different products
    const venta1 = createTestVenta('v-1', 'c-1', [
      { loteId: 'l-1', cantidadKg: '10', precioVentaKg: '5000', costoAplicadoKg: '3000' },
    ]);
    const venta2 = createTestVenta('v-2', 'c-2', [
      { loteId: 'l-2', cantidadKg: '15', precioVentaKg: '4000', costoAplicadoKg: '2500' },
    ]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    const item1 = new VentaItem({
      id: 'vi-1',
      ventaId: 'v-1',
      loteId: 'l-1',
      ventaTipo: 'GRANEL',
      cantidadKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
      ingreso: '50000',
      costoAplicado: '30000',
      costoEmpaques: '0',
    });
    const item2 = new VentaItem({
      id: 'vi-2',
      ventaId: 'v-2',
      loteId: 'l-2',
      ventaTipo: 'GRANEL',
      cantidadKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
      ingreso: '60000',
      costoAplicado: '37500',
      costoEmpaques: '0',
    });
    (mockVentaItemRepo.findByVentaIds as ReturnType<typeof vi.fn>).mockResolvedValue([item1, item2]);

    const lote1 = new Lote({
      id: 'l-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'p-1',
      cantidadCompradaKg: '100',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
    });
    const lote2 = new Lote({
      id: 'l-2',
      producto: TipoProducto.SEMISALADO,
      proveedorId: 'p-1',
      cantidadCompradaKg: '80',
      precioCompraBaseKg: '2500',
      stockDisponibleKg: '30',
      estado: EstadoLote.ACTIVO,
    });
    (mockLoteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([lote1, lote2]);

    const prov1 = new Proveedor({ id: 'p-1', nombre: 'Proveedor Alpha' });
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([prov1]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    // Only one proveedor
    expect(result.desglosePorProveedor).toHaveLength(1);
    expect(result.desglosePorProveedor[0].proveedorNombre).toBe('Proveedor Alpha');
    expect(Number(result.desglosePorProveedor[0].ingreso)).toBeCloseTo(110000, 0);
    expect(result.desglosePorProveedor[0].ventasCount).toBe(2);
  });

  it('should compute flujoDinero and cuentasPorPagar', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('55000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Mock flujo de dinero — non-CREDITO grouped by metodoPago
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '60000' },
      { metodoPago: 'NEQUI', total: '30000' },
      { metodoPago: 'BRE_B', total: '20000' },
    ]);
    // No CREDITO abonos or AbonoPago records in this test
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('15000');

    // Mock cuentas por pagar
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '250000', count: 3 });

    const result = await useCase.execute(inicio, fin);

    expect(result.flujoDinero.efectivo).toBe('60000');
    expect(result.flujoDinero.bancos).toBe('50000'); // NEQUI + BRE_B
    expect(result.flujoDinero.cuentasPorCobrar).toBe('15000');
    expect(result.cuentasPorPagar.totalPendiente).toBe('250000');
    expect(result.cuentasPorPagar.cantidadLotes).toBe(3);
    expect(result.cuentasPorPagar.tajadosPendientesPago).toBe('0');
  });

  it('should return zero flujoDinero and cuentasPorPagar when no data', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '0', count: 0 });

    const result = await useCase.execute(inicio, fin);

    expect(result.flujoDinero.efectivo).toBe('0');
    expect(result.flujoDinero.bancos).toBe('0');
    expect(result.flujoDinero.cuentasPorCobrar).toBe('0');
    expect(result.cuentasPorPagar.totalPendiente).toBe('0');
    expect(result.cuentasPorPagar.cantidadLotes).toBe(0);
    expect(result.cuentasPorPagar.tajadosPendientesPago).toBe('0');
  });

  it('should route CREDITO abono to efectivo/bancos based on metodoPagoAbono', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('200000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Non-CREDITO ventas: EFECTIVO 60000, NEQUI 30000, BRE_B 20000
    // CREDITO is excluded from ingresoTotal-based grouping
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '60000' },
      { metodoPago: 'NEQUI', total: '30000' },
      { metodoPago: 'BRE_B', total: '20000' },
      { metodoPago: 'CREDITO', total: '90000' },  // This should be EXCLUDED from efectivo/bancos
    ]);
    // CREDITO abonos: EFECTIVO 20000, NEQUI 15000
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPagoAbono: 'EFECTIVO', total: '20000' },
      { metodoPagoAbono: 'NEQUI', total: '15000' },
    ]);
    // No AbonoPago records
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('55000');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '0', count: 0 });

    const result = await useCase.execute(inicio, fin);

    // efectivo = 60000 (non-CREDITO) + 20000 (CREDITO abono EFECTIVO) = 80000
    expect(result.flujoDinero.efectivo).toBe('80000');
    // bancos = 30000 (non-CREDITO NEQUI) + 20000 (non-CREDITO BRE_B) + 15000 (CREDITO abono NEQUI) = 65000
    expect(result.flujoDinero.bancos).toBe('65000');
    // cuentasPorCobrar remains unchanged (saldo calculation)
    expect(result.flujoDinero.cuentasPorCobrar).toBe('55000');
  });

  it('should skip CREDITO abonos with NULL metodoPagoAbono (historical data)', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('50000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('25000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Only EFECTIVO non-CREDITO ventas
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '50000' },
    ]);
    // Historical CREDITO ventas with NULL metodoPagoAbono — should be SKIPPED
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPagoAbono: null, total: '30000' },
    ]);
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('30000');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '0', count: 0 });

    const result = await useCase.execute(inicio, fin);

    // NULL metodoPagoAbono is skipped — only 50000 from EFECTIVO
    expect(result.flujoDinero.efectivo).toBe('50000');
    expect(result.flujoDinero.bancos).toBe('0');
  });

  it('should include AbonoPago records in flujoDinero', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('50000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('25000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // EFECTIVO non-CREDITO only
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '50000' },
    ]);
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // AbonoPago records: EFECTIVO 10000, NEQUI 5000
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '10000' },
      { metodoPago: 'NEQUI', total: '5000' },
    ]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('20000');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '0', count: 0 });

    const result = await useCase.execute(inicio, fin);

    // efectivo = 50000 (non-CREDITO) + 10000 (AbonoPago EFECTIVO) = 60000
    expect(result.flujoDinero.efectivo).toBe('60000');
    // bancos = 5000 (AbonoPago NEQUI)
    expect(result.flujoDinero.bancos).toBe('5000');
    expect(result.flujoDinero.cuentasPorCobrar).toBe('20000');
  });

  it('should include tajadosPendientesPago in cuentasPorPagar', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('50000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('25000');
(mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumIngresoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([
      { metodoPago: 'EFECTIVO', total: '50000' },
    ]);
    (mockVentaRepo.sumCreditoAbonoByMetodoPagoAbono as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumAbonoPagoByMetodoPago as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.sumSaldoPendienteByFecha as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.sumCostoPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue({ total: '100000', count: 2 });
    (mockTajadoRepo.sumPendientePago as ReturnType<typeof vi.fn>).mockResolvedValue('45000');

    const result = await useCase.execute(inicio, fin);

    expect(result.cuentasPorPagar.totalPendiente).toBe('100000');
    expect(result.cuentasPorPagar.cantidadLotes).toBe(2);
    expect(result.cuentasPorPagar.tajadosPendientesPago).toBe('45000');
  });
});