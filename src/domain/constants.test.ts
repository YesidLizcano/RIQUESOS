import { describe, it, expect } from 'vitest';
import {
  bloquesCompletos,
  kgParciales,
  isDobleCrema,
  formatDobleCremaGranel,
  formatDobleCremaDetalle,
  DOBLE_CREMA_BLOCK_KG,
} from './constants';

describe('domain/constants', () => {
  describe('DOBLE_CREMA_BLOCK_KG', () => {
    it('should be 2.5', () => {
      expect(DOBLE_CREMA_BLOCK_KG).toBe(2.5);
    });
  });

  describe('bloquesCompletos', () => {
    it('should return 4 for 10 kg', () => {
      expect(bloquesCompletos(10)).toBe(4);
    });

    it('should return 0 for 2 kg', () => {
      expect(bloquesCompletos(2)).toBe(0);
    });

    it('should return 2 for 6 kg', () => {
      expect(bloquesCompletos(6)).toBe(2);
    });

    it('should return 0 for 0 kg', () => {
      expect(bloquesCompletos(0)).toBe(0);
    });
  });

  describe('kgParciales', () => {
    it('should return 0 for exact blocks (10 kg)', () => {
      expect(kgParciales(10)).toBe(0);
    });

    it('should return 1 for 6 kg', () => {
      expect(kgParciales(6)).toBe(1);
    });

    it('should return 1.5 for 4 kg', () => {
      expect(kgParciales(4)).toBe(1.5);
    });
  });

  describe('isDobleCrema', () => {
    it('should return true for DOBLE_CREMA', () => {
      expect(isDobleCrema('DOBLE_CREMA')).toBe(true);
    });

    it('should return false for SEMISALADO', () => {
      expect(isDobleCrema('SEMISALADO')).toBe(false);
    });
  });

  describe('formatDobleCremaGranel', () => {
    // ─── Entero variety (default) ───

    it('should format exact blocks as enteros (10 kg → "4 enteros")', () => {
      expect(formatDobleCremaGranel(10)).toBe('4 enteros');
    });

    it('should format blocks with remainder (6 kg → "2 enteros + 1 kg (de entero)")', () => {
      expect(formatDobleCremaGranel(6)).toBe('2 enteros + 1 kg (de entero)');
    });

    it('should format less than one block (1 kg → "1 kg (de entero)")', () => {
      expect(formatDobleCremaGranel(1)).toBe('1 kg (de entero)');
    });

    it('should format 0 kg → "0"', () => {
      expect(formatDobleCremaGranel(0)).toBe('0');
    });

    it('should format 2.5 kg → "1 enteros" (one full block)', () => {
      expect(formatDobleCremaGranel(2.5)).toBe('1 enteros');
    });

    it('should format 5 kg → "2 enteros"', () => {
      expect(formatDobleCremaGranel(5)).toBe('2 enteros');
    });

    it('should format 8 kg → "3 enteros + 0.5 kg (de entero)"', () => {
      expect(formatDobleCremaGranel(8)).toBe('3 enteros + 0.5 kg (de entero)');
    });

    it('should format 0.5 kg → "0.5 kg (de entero)"', () => {
      expect(formatDobleCremaGranel(0.5)).toBe('0.5 kg (de entero)');
    });

    // ─── Tajado variety ───

    it('should format exact blocks as tajados (5 kg → "2 tajados")', () => {
      expect(formatDobleCremaGranel(5, 'tajado')).toBe('2 tajados');
    });

    it('should format blocks with remainder as tajados (3 kg → "1 tajados + 0.5 kg (de tajado)")', () => {
      expect(formatDobleCremaGranel(3, 'tajado')).toBe('1 tajados + 0.5 kg (de tajado)');
    });

    it('should format less than one block as tajado (1 kg → "1 kg (de tajado)")', () => {
      expect(formatDobleCremaGranel(1, 'tajado')).toBe('1 kg (de tajado)');
    });

    it('should format 0 kg as tajado → "0"', () => {
      expect(formatDobleCremaGranel(0, 'tajado')).toBe('0');
    });
  });

  describe('formatDobleCremaDetalle', () => {
    it('should format full example: 26 enteros + 5 tajados + 2 kg (de entero) + 1 kg (de tajado)', () => {
      expect(formatDobleCremaDetalle(26, 5, 2, 1)).toBe(
        '26 enteros + 5 tajados + 2 kg (de entero) + 1 kg (de tajado)',
      );
    });

    it('should convert loose kg to extra blocks: enteros=0, tajados=0, kgEntero=10, kgTajado=0 → "4 enteros"', () => {
      expect(formatDobleCremaDetalle(0, 0, 10, 0)).toBe('4 enteros');
    });

    it('should convert loose kg with remainder: enteros=0, tajados=0, kgEntero=6, kgTajado=0', () => {
      expect(formatDobleCremaDetalle(0, 0, 6, 0)).toBe('2 enteros + 1 kg (de entero)');
    });

    it('should convert loose tajado kg: enteros=0, tajados=0, kgEntero=0, kgTajado=5', () => {
      expect(formatDobleCremaDetalle(0, 0, 0, 5)).toBe('2 tajados');
    });

    it('should convert loose tajado kg with remainder: enteros=0, tajados=0, kgEntero=0, kgTajado=3', () => {
      expect(formatDobleCremaDetalle(0, 0, 0, 3)).toBe('1 tajados + 0.5 kg (de tajado)');
    });

    it('should combine whole blocks and granel conversions: enteros=10, tajados=2, kgEntero=6, kgTajado=3', () => {
      // 10 + floor(6/2.5)=2 = 12 enteros, remainder 1 kg (de entero)
      // 2 + floor(3/2.5)=1 = 3 tajados, remainder 0.5 kg (de tajado)
      expect(formatDobleCremaDetalle(10, 2, 6, 3)).toBe(
        '12 enteros + 3 tajados + 1 kg (de entero) + 0.5 kg (de tajado)',
      );
    });

    it('should return "0" when all values are 0', () => {
      expect(formatDobleCremaDetalle(0, 0, 0, 0)).toBe('0');
    });

    it('should skip zero segments: enteros=5, tajados=0, kgEntero=0, kgTajado=0', () => {
      expect(formatDobleCremaDetalle(5, 0, 0, 0)).toBe('5 enteros');
    });

    it('should handle only enteros remainder: enteros=0, tajados=0, kgEntero=1, kgTajado=0', () => {
      expect(formatDobleCremaDetalle(0, 0, 1, 0)).toBe('1 kg (de entero)');
    });

    it('should handle only tajado remainder: enteros=0, tajados=0, kgEntero=0, kgTajado=1', () => {
      expect(formatDobleCremaDetalle(0, 0, 0, 1)).toBe('1 kg (de tajado)');
    });

    it('should handle exact blocks from granel only: enteros=0, tajados=0, kgEntero=7.5, kgTajado=0', () => {
      expect(formatDobleCremaDetalle(0, 0, 7.5, 0)).toBe('3 enteros');
    });

    it('should handle mixed exact and remainder: enteros=2, tajados=1, kgEntero=2.5, kgTajado=1', () => {
      // 2 + 1 = 3 enteros, 1 + 0 = 1 tajados, 0 remainder entero, 1 kg (de tajado)
      expect(formatDobleCremaDetalle(2, 1, 2.5, 1)).toBe(
        '3 enteros + 1 tajados + 1 kg (de tajado)',
      );
    });
  });
});