import { describe, it, expect } from 'vitest';
import { MarcarLotePagado } from './MarcarLotePagado';
import { Lote } from '../../domain/entities/Lote';
import { TipoProducto, EstadoPagoLote, MetodoPago } from '../../domain/enums';
import type { LoteRepository } from '../../domain/ports/LoteRepository';

describe('MarcarLotePagado', () => {
  const validLote = new Lote({
    id: 'lote-1',
    producto: TipoProducto.DOBLE_CREMA,
    proveedorId: 'prov-1',
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
    estadoPago: EstadoPagoLote.PENDIENTE,
  });

  function createMockRepo(foundLote: Lote | null = validLote): LoteRepository {
    return {
      findById: async () => foundLote,
      findByIds: async () => [],
      findActive: async () => [],
      findAll: async () => [],
      findByProveedor: async () => [],
      save: async (lote: Lote) => lote,
      deductStock: async () => validLote,
      updateCosts: async () => validLote,
      updateBlocks: async () => validLote,
      softDelete: async () => {},
      restore: async () => {},
      findAllIncludeDeleted: async () => [],
      sumCostoPendientePago: async () => ({ total: '0', count: 0 }),
    };
  }

  it('should mark a PENDIENTE lote as PAGADO with the given metodoPago', async () => {
    const useCase = new MarcarLotePagado(createMockRepo());
    const result = await useCase.execute({ loteId: 'lote-1', metodoPago: 'NEQUI' });

    expect(result.lote.estadoPago).toBe(EstadoPagoLote.PAGADO);
    expect(result.lote.metodoPagoLote).toBe(MetodoPago.NEQUI);
  });

  it('should default to EFECTIVO when metodoPago is invalid', async () => {
    const useCase = new MarcarLotePagado(createMockRepo());
    const result = await useCase.execute({ loteId: 'lote-1', metodoPago: 'INVALID' });

    expect(result.lote.estadoPago).toBe(EstadoPagoLote.PAGADO);
    expect(result.lote.metodoPagoLote).toBe(MetodoPago.EFECTIVO);
  });

  it('should throw if lote is not found', async () => {
    const useCase = new MarcarLotePagado(createMockRepo(null));
    await expect(
      useCase.execute({ loteId: 'nonexistent', metodoPago: 'EFECTIVO' })
    ).rejects.toThrow('Lote not found: nonexistent');
  });

  it('should throw if lote is already PAGADO (entity validation)', async () => {
    const pagadoLote = new Lote({
      id: 'lote-1',
      producto: TipoProducto.DOBLE_CREMA,
      proveedorId: 'prov-1',
      cantidadCompradaKg: '100',
      precioCompraBaseKg: '3000',
      estadoPago: EstadoPagoLote.PAGADO,
    });
    const useCase = new MarcarLotePagado(createMockRepo(pagadoLote));
    await expect(
      useCase.execute({ loteId: 'lote-1', metodoPago: 'EFECTIVO' })
    ).rejects.toThrow('El lote ya está marcado como pagado');
  });
});