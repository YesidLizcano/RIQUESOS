import { describe, it, expect } from 'vitest';
import { Kilogramo } from './Kilogramo';

describe('Kilogramo', () => {
  describe('constructor', () => {
    it('should create from string', () => {
      const kg = new Kilogramo('100');
      expect(kg.value).toBe('100');
    });

    it('should create from number', () => {
      const kg = new Kilogramo(50);
      expect(kg.value).toBe('50');
    });

    it('should create from decimal string', () => {
      const kg = new Kilogramo('25.5');
      expect(kg.value).toBe('25.5');
    });

    it('should create zero value', () => {
      const kg = new Kilogramo('0');
      expect(kg.value).toBe('0');
    });

    it('should reject negative value', () => {
      expect(() => new Kilogramo('-5')).toThrow('Kilogram value cannot be negative');
    });

    it('should reject NaN', () => {
      expect(() => new Kilogramo('abc')).toThrow('Invalid kilogram value');
    });
  });

  describe('subtract', () => {
    it('should subtract smaller from larger', () => {
      const result = new Kilogramo('100').subtract(new Kilogramo('25'));
      expect(result.value).toBe('75');
    });

    it('should subtract to zero', () => {
      const result = new Kilogramo('100').subtract(new Kilogramo('100'));
      expect(result.value).toBe('0');
    });

    it('should throw if subtraction would result in negative', () => {
      expect(() => new Kilogramo('10').subtract(new Kilogramo('20'))).toThrow(
        'Subtraction would result in negative kilograms'
      );
    });
  });

  describe('add', () => {
    it('should add two values', () => {
      const result = new Kilogramo('50').add(new Kilogramo('30'));
      expect(result.value).toBe('80');
    });

    it('should add with decimals', () => {
      const result = new Kilogramo('50.5').add(new Kilogramo('30.3'));
      expect(Number(result.value)).toBeCloseTo(80.8, 1);
    });
  });

  describe('isZero', () => {
    it('should return true for zero', () => {
      expect(new Kilogramo('0').isZero()).toBe(true);
    });

    it('should return false for positive', () => {
      expect(new Kilogramo('10').isZero()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      expect(new Kilogramo('100').equals(new Kilogramo('100'))).toBe(true);
    });

    it('should return false for different values', () => {
      expect(new Kilogramo('100').equals(new Kilogramo('200'))).toBe(false);
    });
  });

  describe('greaterThan', () => {
    it('should return true when greater', () => {
      expect(new Kilogramo('100').greaterThan(new Kilogramo('50'))).toBe(true);
    });

    it('should return false when equal', () => {
      expect(new Kilogramo('100').greaterThan(new Kilogramo('100'))).toBe(false);
    });

    it('should return false when less', () => {
      expect(new Kilogramo('50').greaterThan(new Kilogramo('100'))).toBe(false);
    });
  });

  describe('lessThan', () => {
    it('should return true when less', () => {
      expect(new Kilogramo('50').lessThan(new Kilogramo('100'))).toBe(true);
    });

    it('should return false when equal', () => {
      expect(new Kilogramo('100').lessThan(new Kilogramo('100'))).toBe(false);
    });
  });
});