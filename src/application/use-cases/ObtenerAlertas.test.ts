import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObtenerAlertas, AlertaTipo, AlertaSeveridad } from './ObtenerAlertas';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoLote } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import { Proveedor } from '../../domain/entities/Proveedor';

describe('ObtenerAlertas', () => {
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

  const useCase = new ObtenerAlertas(mockLoteRepo, mockProveedorRepo);

  beforeEach(() => {
    vi.clearAllMocks();
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  // Helper: create a lote with specific stock and age
  function createLote(overrides: {
    id?: string;
    stockDisponibleKg?: string;
    cantidadCompradaKg?: string;
    fechaIngreso?: Date;
    estado?: EstadoLote;
    proveedorId?: string;
  }) {
    return new Lote({
      id: overrides.id ?? 'lote-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: overrides.proveedorId ?? 'prov-1',
      cantidadCompradaKg: overrides.cantidadCompradaKg ?? '100',
      precioCompraBaseKg: '3000',
      stockDisponibleKg: overrides.stockDisponibleKg ?? '100',
      fechaIngreso: overrides.fechaIngreso ?? new Date(),
      estado: overrides.estado ?? EstadoLote.ACTIVO,
    });
  }

  it('should generate STOCK_CRITICO alert when stock < 20 kg', async () => {
    const lote = createLote({ stockDisponibleKg: '15', cantidadCompradaKg: '100' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.STOCK_CRITICO);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.CRITICAL);
    expect(result.resumen.stockCritico).toBe(1);
  });

  it('should generate STOCK_BAJO alert when stock between 20-50 kg', async () => {
    const lote = createLote({ stockDisponibleKg: '35', cantidadCompradaKg: '100' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.STOCK_BAJO);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.WARNING);
    expect(result.resumen.stockBajo).toBe(1);
  });

  it('should generate STOCK_CRITICO alert when stock < 20% of original', async () => {
    // 10 kg left out of 200 kg = 5% < 20%
    const lote = createLote({ stockDisponibleKg: '10', cantidadCompradaKg: '200' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.STOCK_CRITICO);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.CRITICAL);
  });

  it('should generate MUY_ANTIGUO alert when age > 60 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 75);
    const lote = createLote({ stockDisponibleKg: '100', fechaIngreso: oldDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.MUY_ANTIGUO);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.CRITICAL);
    expect(result.resumen.muyAntiguo).toBe(1);
  });

  it('should generate ANTIGUO alert when age between 31-60 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);
    const lote = createLote({ stockDisponibleKg: '100', fechaIngreso: oldDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.ANTIGUO);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.WARNING);
    expect(result.resumen.antiguo).toBe(1);
  });

  it('should generate both stock and age alerts for the same lote', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 75);
    const lote = createLote({ stockDisponibleKg: '15', fechaIngreso: oldDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    // STOCK_CRITICO (stock < 20kg) + MUY_ANTIGUO (age > 60 days)
    expect(result.alertas).toHaveLength(2);
    expect(result.resumen.stockCritico).toBe(1);
    expect(result.resumen.muyAntiguo).toBe(1);
  });

  it('should generate no alerts for a healthy lote', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    const lote = createLote({ stockDisponibleKg: '80', cantidadCompradaKg: '100', fechaIngreso: recentDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(0);
    expect(result.resumen.total).toBe(0);
  });

  it('should exclude AGOTADO lotes from alerts', async () => {
    const lote = createLote({ stockDisponibleKg: '5', estado: EstadoLote.AGOTADO });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(0);
  });

  it('should generate STOCK_CRITICO for zero-stock lote', async () => {
    const lote = createLote({ stockDisponibleKg: '0', cantidadCompradaKg: '100' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].alertType).toBe(AlertaTipo.STOCK_CRITICO);
  });

  it('should deduplicate: STOCK_CRITICO supersedes STOCK_BAJO (stock < 20kg)', async () => {
    // 15 kg < 20 kg → should only generate STOCK_CRITICO, not also STOCK_BAJO
    const lote = createLote({ stockDisponibleKg: '15', cantidadCompradaKg: '100' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    const stockAlerts = result.alertas.filter(
      (a) => a.alertType === AlertaTipo.STOCK_CRITICO || a.alertType === AlertaTipo.STOCK_BAJO,
    );
    expect(stockAlerts).toHaveLength(1);
    expect(stockAlerts[0].alertType).toBe(AlertaTipo.STOCK_CRITICO);
  });

  it('should deduplicate: MUY_ANTIGUO supersedes ANTIGUO (age > 60)', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 75);
    const lote = createLote({ stockDisponibleKg: '100', fechaIngreso: oldDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    const ageAlerts = result.alertas.filter(
      (a) => a.alertType === AlertaTipo.ANTIGUO || a.alertType === AlertaTipo.MUY_ANTIGUO,
    );
    expect(ageAlerts).toHaveLength(1);
    expect(ageAlerts[0].alertType).toBe(AlertaTipo.MUY_ANTIGUO);
  });

  it('should sort critical alerts before warning alerts', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    const loteBajo = createLote({ id: 'l-1', stockDisponibleKg: '35', fechaIngreso: recentDate });
    const loteCritico = createLote({ id: 'l-2', stockDisponibleKg: '10', cantidadCompradaKg: '100', fechaIngreso: recentDate });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([loteBajo, loteCritico]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    // Critical (STOCK_CRITICO) should come before Warning (STOCK_BAJO)
    expect(result.alertas.length).toBeGreaterThanOrEqual(2);
    expect(result.alertas[0].severity).toBe(AlertaSeveridad.CRITICAL);
    expect(result.alertas[result.alertas.length - 1].severity).toBe(AlertaSeveridad.WARNING);
  });

  it('should resolve proveedor names from batch lookup', async () => {
    const lote = createLote({ proveedorId: 'prov-99' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-99', nombre: 'Proveedor XYZ' }),
    ]);

    const result = await useCase.execute();

    // No stock/age alerts for a healthy lote, so we need a lote with low stock
    const lowStockLote = createLote({ stockDisponibleKg: '10', proveedorId: 'prov-99' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lowStockLote]);

    const result2 = await useCase.execute();
    expect(result2.alertas[0].proveedorNombre).toBe('Proveedor XYZ');
  });

  it('should use "Desconocido" when proveedor not found', async () => {
    const lote = createLote({ stockDisponibleKg: '10', proveedorId: 'prov-unknown' });
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([lote]);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.alertas[0].proveedorNombre).toBe('Desconocido');
  });

  it('should return empty result when no active lotes exist', async () => {
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.alertas).toHaveLength(0);
    expect(result.resumen.total).toBe(0);
    expect(result.resumen.stockBajo).toBe(0);
    expect(result.resumen.stockCritico).toBe(0);
    expect(result.resumen.antiguo).toBe(0);
    expect(result.resumen.muyAntiguo).toBe(0);
  });

  it('should correctly compute resumen counts across multiple lotes', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 75);

    const lotes = [
      createLote({ id: 'l-1', stockDisponibleKg: '10', cantidadCompradaKg: '100', fechaIngreso: recentDate }), // STOCK_CRITICO
      createLote({ id: 'l-2', stockDisponibleKg: '35', cantidadCompradaKg: '100', fechaIngreso: recentDate }), // STOCK_BAJO
      createLote({ id: 'l-3', stockDisponibleKg: '100', cantidadCompradaKg: '100', fechaIngreso: oldDate }),   // MUY_ANTIGUO
      createLote({ id: 'l-4', stockDisponibleKg: '100', cantidadCompradaKg: '100', fechaIngreso: recentDate }), // Healthy — no alert
    ];
    (mockLoteRepo.findActive as ReturnType<typeof vi.fn>).mockResolvedValue(lotes);
    (mockProveedorRepo.findByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      new Proveedor({ id: 'prov-1', nombre: 'Prov A' }),
    ]);

    const result = await useCase.execute();

    expect(result.resumen.stockCritico).toBe(1);
    expect(result.resumen.stockBajo).toBe(1);
    expect(result.resumen.muyAntiguo).toBe(1);
    expect(result.resumen.total).toBe(3); // 3 alerts total (l-4 healthy = no alert)
  });
});