import { describe, it, expect } from 'vitest';
import { Empaque } from './Empaque';
import { CategoriaInsumo } from '../enums';

describe('Empaque', () => {
  const baseProps = {
    tipo: 'Bolsa',
    categoria: CategoriaInsumo.BOLSA,
    stock: '100',
    precio: '500',
  };

  describe('constructor', () => {
    it('should create an empaque with valid data', () => {
      const e = new Empaque(baseProps);
      expect(e.tipo).toBe('Bolsa');
      expect(e.categoria).toBe(CategoriaInsumo.BOLSA);
      expect(e.stock.value).toBe('100');
      expect(e.precio.value).toBe('500');
    });

    it('should reject negative stock', () => {
      expect(() => new Empaque({ ...baseProps, stock: '-5' })).toThrow('El stock no puede ser negativo');
    });

    it('should reject negative precio', () => {
      expect(() => new Empaque({ ...baseProps, precio: '-10' })).toThrow('El precio no puede ser negativo');
    });
  });

  describe('isBolsa / isSeparador', () => {
    it('should return true for BOLSA', () => {
      const e = new Empaque(baseProps);
      expect(e.isBolsa).toBe(true);
      expect(e.isSeparador).toBe(false);
    });

    it('should return true for SEPARADOR', () => {
      const e = new Empaque({ ...baseProps, categoria: CategoriaInsumo.SEPARADOR, tipo: 'Separador' });
      expect(e.isBolsa).toBe(false);
      expect(e.isSeparador).toBe(true);
    });
  });

  describe('deduct', () => {
    it('should deduct stock correctly', () => {
      const e = new Empaque(baseProps);
      const result = e.deduct('30');
      expect(result.stock.value).toBe('70');
      expect(result.precio.value).toBe('500'); // price unchanged
    });

    it('should throw if deducting more than available stock', () => {
      const e = new Empaque(baseProps);
      expect(() => e.deduct('150')).toThrow('Stock insuficiente');
    });
  });

  describe('addStock', () => {
    it('should add stock without changing price', () => {
      const e = new Empaque(baseProps);
      const result = e.addStock('50');
      expect(result.stock.value).toBe('150');
      expect(result.precio.value).toBe('500'); // price unchanged
    });
  });

  describe('updateDetails', () => {
    it('should update precio only', () => {
      const e = new Empaque(baseProps);
      const result = e.updateDetails({ precio: '600' });
      expect(result.precio.value).toBe('600');
      expect(result.stock.value).toBe('100');
    });

    it('should preserve existing values when not provided', () => {
      const e = new Empaque(baseProps);
      const result = e.updateDetails({});
      expect(result.precio.value).toBe('500');
      expect(result.stock.value).toBe('100');
    });
  });

  describe('softDelete / restore', () => {
    it('should soft delete and restore', () => {
      const e = new Empaque(baseProps);
      const deleted = e.softDelete();
      expect(deleted.deletedAt).toBeTruthy();
      const restored = deleted.restore();
      expect(restored.deletedAt).toBeNull();
    });
  });
});