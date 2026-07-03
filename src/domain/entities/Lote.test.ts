import { describe, it, expect } from 'vitest';
import { Lote } from './Lote';
import { Kilogramo } from '../value-objects/Kilogramo';
import { EstadoLote, TipoProducto } from '../enums';

describe('Lote', () => {
  const validProps = {
    proveedorId: 'prov-1',
    producto: TipoProducto.DOBLE_CREMA,
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
  };

  describe('constructor — cost calculation', () => {
    it('should calculate Costo_Real_Por_Kg with all cost components', () => {
      const lote = new Lote({
        ...validProps,
        costoFlete: '50000',
        costoTajado: '20000',
        costoEmpaques: '10000',
      });
      // Costo_Real_Por_Kg = (3000 × 100 + 50000 + 20000 + 10000) / 100 = 3800
      expect(lote.costoRealCalculadoKg.value).toBe('3800');
    });

    it('should calculate Costo_Real_Por_Kg with zero optional costs', () => {
      const lote = new Lote({
        ...validProps,
        costoFlete: '0',
        costoTajado: '0',
        costoEmpaques: '0',
      });
      // (3000 × 100 + 0 + 0 + 0) / 100 = 3000
      expect(lote.costoRealCalculadoKg.value).toBe('3000');
    });

    it('should default optional costs to zero when not provided', () => {
      const lote = new Lote(validProps);
      // Same as zero optional costs
      expect(lote.costoFlete.value).toBe('0');
      expect(lote.costoTajado.value).toBe('0');
      expect(lote.costoEmpaques.value).toBe('0');
      expect(lote.costoRealCalculadoKg.value).toBe('3000');
    });

    it('should set stockDisponibleKg to cantidadCompradaKg when not specified', () => {
      const lote = new Lote(validProps);
      expect(lote.stockDisponibleKg.value).toBe('100');
    });

    it('should use provided stockDisponibleKg when specified', () => {
      const lote = new Lote({
        ...validProps,
        stockDisponibleKg: '50',
      });
      expect(lote.stockDisponibleKg.value).toBe('50');
    });
  });

  describe('constructor — status and defaults', () => {
    it('should default to ACTIVO status', () => {
      const lote = new Lote(validProps);
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should accept explicit ACTIVO status', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.ACTIVO });
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should accept AGOTADO status', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.AGOTADO, stockDisponibleKg: '0' });
      expect(lote.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should default version to 0', () => {
      const lote = new Lote(validProps);
      expect(lote.version).toBe(0);
    });

    it('should accept explicit version', () => {
      const lote = new Lote({ ...validProps, version: 3 });
      expect(lote.version).toBe(3);
    });
  });

  describe('constructor — validation', () => {
    it('should reject zero quantity', () => {
      expect(() => new Lote({ ...validProps, cantidadCompradaKg: '0' })).toThrow(
        'Lote cantidadCompradaKg cannot be zero'
      );
    });

    it('should reject missing proveedorId', () => {
      expect(() => new Lote({ ...validProps, proveedorId: '' })).toThrow(
        'Lote proveedorId is required'
      );
    });
  });

  describe('deductStock', () => {
    it('should deduct stock and return new Lote', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.stockDisponibleKg.value).toBe('75');
    });

    it('should transition to AGOTADO when stock reaches zero', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '25' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should remain ACTIVO when stock does not reach zero', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should reject deduction from AGOTADO lote', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.AGOTADO, stockDisponibleKg: '0' });
      expect(() => lote.deductStock(new Kilogramo('5'))).toThrow(
        'Cannot deduct stock from an AGOTADO Lote'
      );
    });

    it('should reject deduction exceeding available stock', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '10' });
      expect(() => lote.deductStock(new Kilogramo('15'))).toThrow(
        'Insufficient stock'
      );
    });

    it('should preserve other properties after deduction', () => {
      const lote = new Lote({ ...validProps, id: 'lote-1', stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.id).toBe('lote-1');
      expect(result.producto).toBe(TipoProducto.DOBLE_CREMA);
      expect(result.proveedorId).toBe('prov-1');
      expect(result.cantidadCompradaKg.value).toBe('100');
      expect(result.costoRealCalculadoKg.value).toBe('3000');
    });
  });

  describe('markAsAgotado', () => {
    it('should transition to AGOTADO status', () => {
      const lote = new Lote({ ...validProps });
      const result = lote.markAsAgotado();
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should preserve all other properties', () => {
      const lote = new Lote({ ...validProps, id: 'lote-1' });
      const result = lote.markAsAgotado();
      expect(result.id).toBe('lote-1');
      expect(result.stockDisponibleKg.value).toBe('100');
    });
  });

  describe('constructor — bloques fields for Doble Crema', () => {
    it('should store bloques fields for DOBLE_CREMA', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100', // Calculated by use case: 40 * 2.5
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 0,
        precioCompraBaseKg: '3000',
      });
      expect(lote.cantidadCompradaKg.value).toBe('100');
      expect(lote.bloquesEnteros).toBe(40);
      expect(lote.bloquesTajados).toBe(0);
      expect(lote.bloquesTajadosDeFabrica).toBe(0);
    });

    it('should store bloquesEnteros and bloquesTajadosDeFabrica for DC lote', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '30', // Calculated by use case: (10 + 2) * 2.5
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 2,
        precioCompraBaseKg: '3000',
      });
      expect(lote.cantidadCompradaKg.value).toBe('30');
      expect(lote.bloquesEnteros).toBe(10);
      expect(lote.bloquesTajadosDeFabrica).toBe(2);
    });

    it('should default bloques fields to 0 for Semisalado', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(lote.bloquesEnteros).toBe(0);
      expect(lote.bloquesTajados).toBe(0);
      expect(lote.bloquesTajadosDeFabrica).toBe(0);
    });
  });

  describe('registrarTajado', () => {
    it('should decrement bloquesEnteros and increment bloquesTajados', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 0,
        precioCompraBaseKg: '3000',
      });
      const result = lote.registrarTajado(5, '1500');
      expect(result.bloquesEnteros).toBe(35);
      expect(result.bloquesTajados).toBe(5);
    });

    it('should add tajado cost to costoTajado and recalculate costoRealCalculadoKg', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
        costoEmpaques: '5000',
      });
      // cantidadCompradaKg = 100
      // After tajado: costoTajado = 0 + 1500 * 10 = 15000
      // costoReal = (3000 * 100 + 10000 + 15000 + 5000) / 100 = 3300
      const result = lote.registrarTajado(10, '1500');
      expect(result.costoTajado.value).toBe('15000');
      expect(result.costoRealCalculadoKg.value).toBe('3300');
    });

    it('should accumulate tajado costs across multiple tajado operations', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const first = lote.registrarTajado(5, '1500');
      expect(first.costoTajado.value).toBe('7500');
      expect(first.bloquesEnteros).toBe(35);
      expect(first.bloquesTajados).toBe(5);

      const second = first.registrarTajado(3, '2000');
      expect(second.costoTajado.value).toBe('13500');
      expect(second.bloquesEnteros).toBe(32);
      expect(second.bloquesTajados).toBe(8);
    });

    it('should not change cantidadCompradaKg or stockDisponibleKg', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const result = lote.registrarTajado(5, '1500');
      expect(result.cantidadCompradaKg.value).toBe('100');
      expect(result.stockDisponibleKg.value).toBe('100');
    });

    it('should reject tajado when bloquesEnteros is insufficient', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '7.5',
        bloquesEnteros: 3,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.registrarTajado(5, '1500')).toThrow(
        'No hay suficientes bloques enteros'
      );
    });

    it('should reject tajado on SEMISALADO lote', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(() => lote.registrarTajado(1, '1500')).toThrow(
        'Solo se puede registrar tajado en lotes de Doble Crema'
      );
    });

    it('should reject tajado with zero or negative bloques', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.registrarTajado(0, '1500')).toThrow(
        'La cantidad de bloques debe ser mayor a 0'
      );
    });
  });
});