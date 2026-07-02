import { describe, it, expect } from 'vitest';
import { GastoFijo } from './GastoFijo';

describe('GastoFijo', () => {
  describe('constructor', () => {
    it('should create a GastoFijo with valid data', () => {
      const gasto = new GastoFijo({ concepto: 'Alquiler', valor: '50000' });
      expect(gasto.concepto).toBe('Alquiler');
      expect(gasto.valor.value).toBe('50000');
    });

    it('should default id to empty string', () => {
      const gasto = new GastoFijo({ concepto: 'Alquiler', valor: '50000' });
      expect(gasto.id).toBe('');
    });

    it('should accept provided id', () => {
      const gasto = new GastoFijo({ id: 'gf-1', concepto: 'Alquiler', valor: '50000' });
      expect(gasto.id).toBe('gf-1');
    });

    it('should default fecha to current date', () => {
      const before = new Date();
      const gasto = new GastoFijo({ concepto: 'Alquiler', valor: '50000' });
      const after = new Date();
      expect(gasto.fecha.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(gasto.fecha.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('validation', () => {
    it('should reject empty concepto', () => {
      expect(() => new GastoFijo({ concepto: '', valor: '50000' })).toThrow(
        'GastoFijo concepto is required'
      );
    });

    it('should reject whitespace-only concepto', () => {
      expect(() => new GastoFijo({ concepto: '   ', valor: '50000' })).toThrow(
        'GastoFijo concepto is required'
      );
    });

    it('should reject negative valor', () => {
      expect(() => new GastoFijo({ concepto: 'Alquiler', valor: '-100' })).toThrow(
        'GastoFijo valor cannot be negative'
      );
    });

    it('should accept zero valor', () => {
      const gasto = new GastoFijo({ concepto: 'Gratis', valor: '0' });
      expect(gasto.valor.value).toBe('0');
    });
  });

  describe('updateConcepto', () => {
    it('should return a new GastoFijo with updated concepto', () => {
      const gasto = new GastoFijo({ id: 'gf-1', concepto: 'Alquiler', valor: '50000' });
      const updated = gasto.updateConcepto('Servicios');
      expect(updated.concepto).toBe('Servicios');
      expect(updated.valor.value).toBe('50000');
      expect(updated.id).toBe('gf-1');
    });
  });

  describe('updateValor', () => {
    it('should return a new GastoFijo with updated valor', () => {
      const gasto = new GastoFijo({ id: 'gf-1', concepto: 'Alquiler', valor: '50000' });
      const updated = gasto.updateValor('55000');
      expect(updated.valor.value).toBe('55000');
      expect(updated.concepto).toBe('Alquiler');
      expect(updated.id).toBe('gf-1');
    });
  });
});