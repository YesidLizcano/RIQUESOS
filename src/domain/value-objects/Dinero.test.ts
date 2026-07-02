import { describe, it, expect } from 'vitest';
import { Dinero } from './Dinero';

describe('Dinero', () => {
  describe('constructor', () => {
    it('should create from string', () => {
      const d = new Dinero('5000');
      expect(d.value).toBe('5000');
    });

    it('should create from number', () => {
      const d = new Dinero(3000);
      expect(d.value).toBe('3000');
    });

    it('should create from decimal string', () => {
      const d = new Dinero('3000.50');
      expect(d.value).toBe('3000.50');
    });

    it('should create from zero', () => {
      const d = new Dinero('0');
      expect(d.value).toBe('0');
    });

    it('should create from negative value', () => {
      const d = new Dinero('-100');
      expect(d.value).toBe('-100');
    });

    it('should reject invalid monetary value', () => {
      expect(() => new Dinero('abc')).toThrow('Invalid monetary value: abc');
    });

    it('should reject empty string', () => {
      expect(() => new Dinero('')).toThrow('Invalid monetary value');
    });
  });

  describe('add', () => {
    it('should add two positive values', () => {
      const result = new Dinero('3000').add(new Dinero('2000'));
      expect(result.value).toBe('5000');
    });

    it('should add with decimals', () => {
      const result = new Dinero('3000.50').add(new Dinero('2000.50'));
      expect(result.value).toBe('5001');
    });

    it('should add negative to positive', () => {
      const result = new Dinero('5000').add(new Dinero('-2000'));
      expect(result.value).toBe('3000');
    });
  });

  describe('subtract', () => {
    it('should subtract two values', () => {
      const result = new Dinero('5000').subtract(new Dinero('2000'));
      expect(result.value).toBe('3000');
    });

    it('should produce negative result', () => {
      const result = new Dinero('2000').subtract(new Dinero('5000'));
      expect(result.value).toBe('-3000');
    });
  });

  describe('multiply', () => {
    it('should multiply by integer', () => {
      const result = new Dinero('5000').multiply('10');
      expect(result.value).toBe('50000');
    });

    it('should multiply by decimal', () => {
      const result = new Dinero('3000').multiply('10');
      expect(result.value).toBe('30000');
    });

    it('should multiply by number', () => {
      const result = new Dinero('5000').multiply(10);
      expect(result.value).toBe('50000');
    });
  });

  describe('divide', () => {
    it('should divide evenly', () => {
      const result = new Dinero('50000').divide('10');
      expect(result.value).toBe('5000');
    });

    it('should divide with decimal result', () => {
      const result = new Dinero('10000').divide('3');
      // Should produce approximately 3333.333...
      expect(Number(result.value)).toBeCloseTo(3333.33, 1);
    });

    it('should throw on division by zero', () => {
      expect(() => new Dinero('100').divide('0')).toThrow('Division by zero');
    });

    it('should throw on division by zero number', () => {
      expect(() => new Dinero('100').divide(0)).toThrow('Division by zero');
    });
  });

  describe('isNegative', () => {
    it('should return true for negative', () => {
      expect(new Dinero('-100').isNegative()).toBe(true);
    });

    it('should return false for positive', () => {
      expect(new Dinero('100').isNegative()).toBe(false);
    });

    it('should return false for zero', () => {
      expect(new Dinero('0').isNegative()).toBe(false);
    });
  });

  describe('isZero', () => {
    it('should return true for zero', () => {
      expect(new Dinero('0').isZero()).toBe(true);
    });

    it('should return false for positive', () => {
      expect(new Dinero('100').isZero()).toBe(false);
    });

    it('should return false for negative', () => {
      expect(new Dinero('-100').isZero()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      expect(new Dinero('5000').equals(new Dinero('5000'))).toBe(true);
    });

    it('should return false for different values', () => {
      expect(new Dinero('5000').equals(new Dinero('3000'))).toBe(false);
    });
  });

  describe('greaterThan', () => {
    it('should return true when greater', () => {
      expect(new Dinero('5000').greaterThan(new Dinero('3000'))).toBe(true);
    });

    it('should return false when equal', () => {
      expect(new Dinero('5000').greaterThan(new Dinero('5000'))).toBe(false);
    });

    it('should return false when less', () => {
      expect(new Dinero('3000').greaterThan(new Dinero('5000'))).toBe(false);
    });
  });

  describe('lessThan', () => {
    it('should return true when less', () => {
      expect(new Dinero('3000').lessThan(new Dinero('5000'))).toBe(true);
    });

    it('should return false when equal', () => {
      expect(new Dinero('5000').lessThan(new Dinero('5000'))).toBe(false);
    });
  });

  describe('zero factory', () => {
    it('should create zero value', () => {
      const z = Dinero.zero();
      expect(z.isZero()).toBe(true);
      expect(z.value).toBe('0');
    });
  });
});