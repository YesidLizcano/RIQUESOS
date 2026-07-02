import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObtenerMetricas } from './ObtenerMetricas';
import { Venta } from '../../domain/entities/Venta';
import { Lote } from '../../domain/entities/Lote';
import { Cliente } from '../../domain/entities/Cliente';
import { TipoProducto, TipoCliente, EstadoLote } from '../../domain/enums';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { GastoFijoRepository } from '../../domain/ports/GastoFijoRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';

describe('ObtenerMetricas', () => {
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
    findAll: vi.fn(),
    findByProveedor: vi.fn(),
    save: vi.fn(),
    deductStock: vi.fn(),
    updateCosts: vi.fn(),
    delete: vi.fn(),
  };

  const mockGastoFijoRepo: GastoFijoRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByDateRange: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    sumByPeriod: vi.fn(),
  };

  const mockClienteRepo: ClienteRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new ObtenerMetricas(mockVentaRepo, mockLoteRepo, mockGastoFijoRepo, mockClienteRepo);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: findByIds returns empty array (for tests without ventas)
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  const inicio = new Date('2026-06-01');
  const fin = new Date('2026-06-30');

  it('should compute financial metrics for a period', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('80000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('48000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('10000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ingresoTotal).toBe('80000');
    expect(result.periodo.costoMercancia).toBe('48000');
    expect(result.periodo.gananciaBruta).toBe('32000');
    expect(result.periodo.gastosFijos).toBe('10000');
    expect(result.periodo.gananciaNeta).toBe('22000');
  });

  it('should return zero metrics when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ingresoTotal).toBe('0');
    expect(result.periodo.costoMercancia).toBe('0');
    expect(result.periodo.gananciaBruta).toBe('0');
    expect(result.periodo.gastosFijos).toBe('0');
    expect(result.periodo.gananciaNeta).toBe('0');
  });

  it('should compute net loss when expenses exceed gross profit', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('80000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('48000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    // gananciaBruta = 80000 - 48000 = 32000
    // gananciaNeta = 32000 - 100000 = -68000
    expect(result.periodo.gananciaBruta).toBe('32000');
    expect(result.periodo.gananciaNeta).toBe('-68000');
  });

  it('should aggregate inventory by product type for ACTIVO lotes', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
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
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Lote 1: costoRealCalculadoKg = (3000*50+0+0+0)/50 = 3000, stock=50 → value = 150000
    const lote1 = new Lote({
      id: 'l-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '50',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: '50',
      estado: EstadoLote.ACTIVO,
    });
    // Lote 2: costoRealCalculadoKg = (3500*30+0+0+0)/30 = 3500, stock=30 → value = 105000
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

    // Total inventory value = 150000 + 105000 = 255000
    expect(result.inventarioResumen.valorTotal).toBe('255000');
    expect(result.inventarioResumen.lotesActivos).toBe(2);
  });

  it('should compute ventasCount, clientesActivos, and kgVendidos from sales', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('110000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('5000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    const venta2 = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-2',
      cantidadVendidaKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
    });
    const venta3 = new Venta({
      id: 'v-3',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '5',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA }),
    ]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.ventasCount).toBe(3);
    expect(result.periodo.clientesActivos).toBe(2); // c-1 and c-2
    expect(result.periodo.kgVendidos).toBe('30'); // 10 + 15 + 5
  });

  it('should compute gross and net margin percentages', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('10000');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    // gananciaBruta = 100000 - 60000 = 40000 → margenBruto = 40000/100000 * 100 = 40%
    // gananciaNeta = 40000 - 10000 = 30000 → margenNeto = 30000/100000 * 100 = 30%
    expect(result.periodo.margenBrutoPct).not.toBe('N/A');
    expect(result.periodo.margenNetoPct).not.toBe('N/A');
    // Verify approximate values (string-based math may have minor precision)
    expect(Number(result.periodo.margenBrutoPct)).toBeCloseTo(40, 0);
    expect(Number(result.periodo.margenNetoPct)).toBeCloseTo(30, 0);
  });

  it('should return N/A margins when revenue is zero', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.periodo.margenBrutoPct).toBe('N/A');
    expect(result.periodo.margenNetoPct).toBe('N/A');
  });

  it('should use findByIds for batch client resolution (N+1 fix)', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    const venta2 = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-2',
      cantidadVendidaKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
    });
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    const cliente1 = new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA });
    const cliente2 = new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA });
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([cliente1, cliente2]);

    const result = await useCase.execute(inicio, fin, 5);

    // Should call findByIds with the top client IDs, NOT findById per client
    expect(mockClienteRepo.findByIds).toHaveBeenCalledWith(['c-2', 'c-1']);
    expect(mockClienteRepo.findById).not.toHaveBeenCalled();
    expect(result.topClientes.length).toBe(2);
    expect(result.topClientes[0].nombre).toBe('Client B'); // c-2 has higher revenue
    expect(result.topClientes[1].nombre).toBe('Client A');
  });

  it('should rank top clients by revenue', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('100000');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('60000');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    const venta2 = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-2',
      cantidadVendidaKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
    });
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2]);

    const cliente1 = new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA });
    const cliente2 = new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MINORISTA });
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([cliente1, cliente2]);

    const result = await useCase.execute(inicio, fin, 5);

    expect(result.topClientes.length).toBeLessThanOrEqual(5);
    // Client B: 15 × 4000 = 60000 > Client A: 10 × 5000 = 50000
    expect(result.topClientes[0].clienteId).toBe('c-2');
  });

  it('should compute ventasDiarias grouping by date and filling gaps', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Two ventas on June 5 and one on June 7
    const venta1 = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
      fecha: new Date(2026, 5, 5), // June 5 local time
    });
    const venta2 = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-1',
      cantidadVendidaKg: '5',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
      fecha: new Date(2026, 5, 5), // June 5 local time
    });
    const venta3 = new Venta({
      id: 'v-3',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '8',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
      fecha: new Date(2026, 5, 7), // June 7 local time
    });
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MAYORISTA }),
    ]);

    const result = await useCase.execute(new Date(2026, 5, 1), new Date(2026, 5, 10, 23, 59, 59, 999));

    // Should have entries for June 1-10 (10 days)
    expect(result.ventasDiarias).toHaveLength(10);

    // June 1, 2, 3, 4 should have total '0'
    expect(result.ventasDiarias[0].fecha).toBe('2026-06-01');
    expect(result.ventasDiarias[0].total).toBe('0');

    // June 5: venta1 (10*5000=50000) + venta2 (5*4000=20000) = 70000
    const june5 = result.ventasDiarias.find((vd) => vd.fecha === '2026-06-05');
    expect(june5).toBeDefined();
    expect(Number(june5!.total)).toBeCloseTo(70000, 0);

    // June 6 should be '0' (gap)
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
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const venta1 = new Venta({
      id: 'v-1',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '10',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    const venta2 = new Venta({
      id: 'v-2',
      clienteId: 'c-2',
      loteId: 'l-2',
      cantidadVendidaKg: '15',
      precioVentaKg: '4000',
      costoAplicadoKg: '2500',
    });
    const venta3 = new Venta({
      id: 'v-3',
      clienteId: 'c-1',
      loteId: 'l-1',
      cantidadVendidaKg: '5',
      precioVentaKg: '5000',
      costoAplicadoKg: '3000',
    });
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([venta1, venta2, venta3]);

    // c-1 is MINORISTA, c-2 is MAYORISTA
    (mockClienteRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Cliente({ id: 'c-1', nombre: 'Client A', tipo: TipoCliente.MINORISTA }),
      new Cliente({ id: 'c-2', nombre: 'Client B', tipo: TipoCliente.MAYORISTA }),
    ]);

    const result = await useCase.execute(inicio, fin);

    expect(result.ingresosPorTipoCliente).toHaveLength(2);

    // MINORISTA (c-1): venta1 (10*5000=50000) + venta3 (5*5000=25000) = 75000
    const minorista = result.ingresosPorTipoCliente.find((itc) => itc.tipo === 'MINORISTA');
    expect(minorista).toBeDefined();
    expect(Number(minorista!.total)).toBeCloseTo(75000, 0);

    // MAYORISTA (c-2): venta2 (15*4000=60000)
    const mayorista = result.ingresosPorTipoCliente.find((itc) => itc.tipo === 'MAYORISTA');
    expect(mayorista).toBeDefined();
    expect(Number(mayorista!.total)).toBeCloseTo(60000, 0);
  });

  it('should return empty ventasDiarias with zeros when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(new Date(2026, 5, 1), new Date(2026, 5, 3, 23, 59, 59, 999));

    expect(result.ventasDiarias).toHaveLength(3);
    expect(result.ventasDiarias.every((vd) => vd.total === '0')).toBe(true);
  });

  it('should return empty ingresosPorTipoCliente when no sales exist', async () => {
    (mockVentaRepo.sumIngresosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockVentaRepo.sumCostosByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockGastoFijoRepo.sumByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue('0');
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockVentaRepo.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute(inicio, fin);

    expect(result.ingresosPorTipoCliente).toHaveLength(0);
  });
});