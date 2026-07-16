import { describe, it, expect } from 'vitest';
import { CompraInsumo } from './CompraInsumo';
import { CategoriaInsumo } from '../enums';

describe('CompraInsumo', () => {
  const baseProps = {
    empaqueId: 'emp-1',
    categoria: CategoriaInsumo.BOLSA,
    cantidad: '100',
    precioUnitario: '500',
  };

  describe('constructor', () => {
    it('should set cantidadRestante = cantidad when not provided', () => {
      const compra = new CompraInsumo(baseProps);
      expect(compra.cantidadRestante.value).toBe('100');
    });

    it('should use provided cantidadRestante when given', () => {
      const compra = new CompraInsumo({
        ...baseProps,
        cantidadRestante: '50',
      });
      expect(compra.cantidadRestante.value).toBe('50');
    });

    it('should calculate costoTotal = cantidad × precioUnitario', () => {
      const compra = new CompraInsumo(baseProps);
      // 100 × 500 = 50000
      expect(compra.costoTotal.value).toBe('50000');
    });

    it('should accept explicit costoTotal when provided', () => {
      const compra = new CompraInsumo({
        ...baseProps,
        costoTotal: '45000',
      });
      expect(compra.costoTotal.value).toBe('45000');
    });

    it('should throw if empaqueId is empty', () => {
      expect(() => new CompraInsumo({ ...baseProps, empaqueId: '' })).toThrow('El empaque es obligatorio');
    });

    it('should throw if cantidad is zero', () => {
      expect(() => new CompraInsumo({ ...baseProps, cantidad: '0' })).toThrow('La cantidad debe ser mayor a 0');
    });

    it('should throw if cantidad is negative', () => {
      expect(() => new CompraInsumo({ ...baseProps, cantidad: '-5' })).toThrow('La cantidad no puede ser negativa');
    });

    it('should throw if precioUnitario is negative', () => {
      expect(() => new CompraInsumo({ ...baseProps, precioUnitario: '-10' })).toThrow('El precio unitario no puede ser negativo');
    });

    it('should throw if cantidadRestante is negative', () => {
      expect(() => new CompraInsumo({ ...baseProps, cantidadRestante: '-5' })).toThrow('La cantidad restante no puede ser negativa');
    });
  });

  describe('deduct', () => {
    it('should reduce cantidadRestante', () => {
      const compra = new CompraInsumo(baseProps);
      const result = compra.deduct('30');
      expect(result.cantidadRestante.value).toBe('70');
      // Original unchanged (immutability)
      expect(compra.cantidadRestante.value).toBe('100');
    });

    it('should throw if trying to deduct more than cantidadRestante', () => {
      const compra = new CompraInsumo(baseProps);
      expect(() => compra.deduct('150')).toThrow('Stock insuficiente en lote');
    });

    it('should return new CompraInsumo (immutability)', () => {
      const compra = new CompraInsumo(baseProps);
      const result = compra.deduct('50');
      expect(result).not.toBe(compra);
      expect(result.cantidadRestante.value).toBe('50');
      expect(compra.cantidadRestante.value).toBe('100');
    });

    it('should preserve other fields when deducting', () => {
      const compra = new CompraInsumo(baseProps);
      const result = compra.deduct('20');
      expect(result.id).toBe(compra.id);
      expect(result.empaqueId).toBe(compra.empaqueId);
      expect(result.categoria).toBe(compra.categoria);
      expect(result.cantidad.value).toBe('100');
      expect(result.precioUnitario.value).toBe('500');
      expect(result.costoTotal.value).toBe('50000');
    });

    it('should deduct from partially consumed lot', () => {
      const compra = new CompraInsumo({
        ...baseProps,
        cantidadRestante: '40',
      });
      const result = compra.deduct('20');
      expect(result.cantidadRestante.value).toBe('20');
    });
  });
});