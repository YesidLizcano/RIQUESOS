import { describe, it, expect } from 'vitest';
import { Venta } from './Venta';

describe('Venta', () => {
  const validProps = {
    clienteId: 'cliente-1',
    loteId: 'lote-1',
    cantidadVendidaKg: '10',
    precioVentaKg: '5000',
    costoAplicadoKg: '3000',
  };

  describe('constructor — financial calculation', () => {
    it('should calculate Ingreso_Total = Cantidad × Precio_Asignado', () => {
      const venta = new Venta(validProps);
      // 10 × 5000 = 50000
      expect(venta.ingresoTotal.value).toBe('50000');
    });

    it('should calculate Costo_Mercancía = Cantidad × Costo_Real_Por_Kg', () => {
      const venta = new Venta(validProps);
      // 10 × 3000 = 30000
      expect(venta.costoAplicado.value).toBe('30000');
    });

    it('should calculate Ganancia_Bruta = Ingreso_Total − Costo_Mercancía', () => {
      const venta = new Venta(validProps);
      // 50000 − 30000 = 20000
      expect(venta.gananciaBruta.value).toBe('20000');
    });

    it('should calculate zero Ganancia_Bruta when price equals cost', () => {
      const venta = new Venta({
        ...validProps,
        cantidadVendidaKg: '5',
        precioVentaKg: '3000',
        costoAplicadoKg: '3000',
      });
      // 5 × 3000 = 15000, 5 × 3000 = 15000, 15000 − 15000 = 0
      expect(venta.ingresoTotal.value).toBe('15000');
      expect(venta.costoAplicado.value).toBe('15000');
      expect(venta.gananciaBruta.value).toBe('0');
    });

    it('should handle domicilio fields', () => {
      const venta = new Venta({
        ...validProps,
        valorDomicilio: '5000',
        domiciliario: 'Juan',
      });
      expect(venta.valorDomicilio.value).toBe('5000');
      expect(venta.domiciliario).toBe('Juan');
    });

    it('should default domicilio fields to zero and empty string', () => {
      const venta = new Venta(validProps);
      expect(venta.valorDomicilio.value).toBe('0');
      expect(venta.domiciliario).toBe('');
    });
  });

  describe('constructor — validation', () => {
    it('should reject missing clienteId', () => {
      expect(() => new Venta({ ...validProps, clienteId: '' })).toThrow(
        'Venta clienteId is required'
      );
    });

    it('should reject missing loteId', () => {
      expect(() => new Venta({ ...validProps, loteId: '' })).toThrow(
        'Venta loteId is required'
      );
    });

    it('should reject zero cantidadVendidaKg', () => {
      expect(() => new Venta({ ...validProps, cantidadVendidaKg: '0' })).toThrow(
        'Venta cantidadVendidaKg cannot be zero'
      );
    });

    it('should reject negative precioVentaKg', () => {
      expect(() => new Venta({ ...validProps, precioVentaKg: '-100' })).toThrow(
        'Venta precioVentaKg cannot be negative'
      );
    });
  });

  describe('constructor — ventaTipo', () => {
    it('should default ventaTipo to GRANEL when not provided', () => {
      const venta = new Venta(validProps);
      expect(venta.ventaTipo).toBe('GRANEL');
    });

    it('should accept BLOQUES ventaTipo', () => {
      const venta = new Venta({ ...validProps, ventaTipo: 'BLOQUES' });
      expect(venta.ventaTipo).toBe('BLOQUES');
    });

    it('should accept GRANEL ventaTipo explicitly', () => {
      const venta = new Venta({ ...validProps, ventaTipo: 'GRANEL' });
      expect(venta.ventaTipo).toBe('GRANEL');
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const venta = new Venta(validProps);
      // TypeScript enforces readonly at compile time, but at runtime we verify
      // the properties exist and are the expected values
      expect(venta.clienteId).toBe('cliente-1');
      expect(venta.loteId).toBe('lote-1');
      expect(venta.cantidadVendidaKg.value).toBe('10');
      expect(venta.precioVentaKg.value).toBe('5000');
      expect(venta.ingresoTotal.value).toBe('50000');
      expect(venta.costoAplicado.value).toBe('30000');
      expect(venta.gananciaBruta.value).toBe('20000');
    });

    it('should not have update or delete methods', () => {
      const venta = new Venta(validProps);
      expect((venta as unknown as Record<string, unknown>)['update']).toBeUndefined();
      expect((venta as unknown as Record<string, unknown>)['delete']).toBeUndefined();
    });
  });
});