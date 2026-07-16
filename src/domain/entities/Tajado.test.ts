import { describe, it, expect } from 'vitest';
import { Tajado } from './Tajado';
import { ESTADO_PAGO_TAJADO } from '../enums';

describe('Tajado', () => {
  const validProps = {
    loteId: 'lote-1',
    cantidadBloques: 5,
    precioPorBloque: '1500',
    tajador: 'Carlos',
  };

  describe('constructor — basic fields', () => {
    it('should create a Tajado with required fields', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.loteId).toBe('lote-1');
      expect(tajado.cantidadBloques).toBe(5);
      expect(tajado.precioPorBloque.value).toBe('1500');
      expect(tajado.tajador).toBe('Carlos');
    });

    it('should calculate costoTotal as precioPorBloque × cantidadBloques', () => {
      const tajado = new Tajado(validProps);
      // 5 × 1500 = 7500
      expect(tajado.costoTotal.value).toBe('7500');
    });

    it('should default separadoresKg to "0"', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.separadoresKg.value).toBe('0');
    });

    it('should default costoSeparadores to "0"', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.costoSeparadores.value).toBe('0');
    });

    it('should assign id from props when provided', () => {
      const tajado = new Tajado({ ...validProps, id: 't-1' });
      expect(tajado.id).toBe('t-1');
    });

    it('should default id to empty string when not provided', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.id).toBe('');
    });

    it('should default fecha to current date when not provided', () => {
      const before = new Date();
      const tajado = new Tajado(validProps);
      const after = new Date();
      expect(tajado.fecha.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(tajado.fecha.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should default estadoPago to PENDIENTE', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PENDIENTE);
    });

    it('should accept estadoPago from props', () => {
      const tajado = new Tajado({ ...validProps, estadoPago: ESTADO_PAGO_TAJADO.PAGADO });
      expect(tajado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PAGADO);
    });
  });

  describe('constructor — separadores fields', () => {
    it('should accept separadoresKg and costoSeparadores', () => {
      const tajado = new Tajado({
        ...validProps,
        separadoresKg: '2.5',
        costoSeparadores: '5000',
      });
      expect(tajado.separadoresKg.value).toBe('2.5');
      expect(tajado.costoSeparadores.value).toBe('5000');
    });

    it('should accept zero separadoresKg', () => {
      const tajado = new Tajado({
        ...validProps,
        separadoresKg: '0',
        costoSeparadores: '0',
      });
      expect(tajado.separadoresKg.value).toBe('0');
      expect(tajado.costoSeparadores.value).toBe('0');
    });

    it('should reject negative separadoresKg', () => {
      expect(() => new Tajado({ ...validProps, separadoresKg: '-1' })).toThrow(
        'Los kg de separadores no pueden ser negativos'
      );
    });

    it('should reject negative costoSeparadores', () => {
      expect(() => new Tajado({ ...validProps, costoSeparadores: '-100' })).toThrow(
        'El costo de separadores no puede ser negativo'
      );
    });
  });

  describe('constructor — validation', () => {
    it('should reject cantidadBloques <= 0', () => {
      expect(() => new Tajado({ ...validProps, cantidadBloques: 0 })).toThrow(
        'La cantidad de bloques debe ser mayor a 0'
      );
    });

    it('should reject empty loteId', () => {
      expect(() => new Tajado({ ...validProps, loteId: '' })).toThrow(
        'El lote es obligatorio'
      );
    });

    it('should reject empty precioPorBloque', () => {
      expect(() => new Tajado({ ...validProps, precioPorBloque: '' })).toThrow();
    });

    it('should reject empty tajador', () => {
      expect(() => new Tajado({ ...validProps, tajador: '' })).toThrow(
        'El tajador es obligatorio'
      );
    });

    it('should reject whitespace-only tajador', () => {
      expect(() => new Tajado({ ...validProps, tajador: '   ' })).toThrow(
        'El tajador es obligatorio'
      );
    });
  });

  describe('markAsPagado', () => {
    it('should return a new Tajado with estadoPago PAGADO', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PENDIENTE);

      const pagado = tajado.markAsPagado();
      expect(pagado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PAGADO);
    });

    it('should preserve all other fields when marking as pagado', () => {
      const tajado = new Tajado({ ...validProps, id: 't-1', separadoresKg: '3', costoSeparadores: '4500' });
      const pagado = tajado.markAsPagado();

      expect(pagado.id).toBe('t-1');
      expect(pagado.loteId).toBe('lote-1');
      expect(pagado.cantidadBloques).toBe(5);
      expect(pagado.precioPorBloque.value).toBe('1500');
      expect(pagado.tajador).toBe('Carlos');
      expect(pagado.costoTotal.value).toBe('7500');
      expect(pagado.separadoresKg.value).toBe('3');
      expect(pagado.costoSeparadores.value).toBe('4500');
      expect(pagado.fecha).toEqual(tajado.fecha);
    });

    it('should not mutate the original Tajado', () => {
      const tajado = new Tajado(validProps);
      const pagado = tajado.markAsPagado();

      expect(tajado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PENDIENTE);
      expect(pagado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PAGADO);
    });

    it('should return PAGADO even if already PAGADO (use case validates before calling)', () => {
      const tajado = new Tajado({ ...validProps, estadoPago: ESTADO_PAGO_TAJADO.PAGADO });
      const result = tajado.markAsPagado();
      expect(result.estadoPago).toBe(ESTADO_PAGO_TAJADO.PAGADO);
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const tajado = new Tajado(validProps);
      expect(tajado.loteId).toBe('lote-1');
      expect(tajado.cantidadBloques).toBe(5);
      expect(tajado.precioPorBloque.value).toBe('1500');
      expect(tajado.tajador).toBe('Carlos');
      expect(tajado.costoTotal.value).toBe('7500');
      expect(tajado.separadoresKg.value).toBe('0');
      expect(tajado.costoSeparadores.value).toBe('0');
      expect(tajado.estadoPago).toBe(ESTADO_PAGO_TAJADO.PENDIENTE);
    });

    it('should not have update or delete methods', () => {
      const tajado = new Tajado(validProps);
      expect((tajado as unknown as Record<string, unknown>)['update']).toBeUndefined();
      expect((tajado as unknown as Record<string, unknown>)['delete']).toBeUndefined();
    });
  });
});