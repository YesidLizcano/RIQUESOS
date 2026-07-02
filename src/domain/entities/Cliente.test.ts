import { describe, it, expect } from 'vitest';
import { Cliente } from './Cliente';
import { TipoCliente, TipoProducto } from '../enums';
import { Dinero } from '../value-objects/Dinero';

describe('Cliente', () => {
  describe('constructor — MAYORISTA', () => {
    it('should create a MAYORISTA client with custom prices', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Mayor',
        tipo: TipoCliente.MAYORISTA,
        precioDobleCrema: '4500',
        precioSemisalado: '4000',
      });
      expect(cliente.nombre).toBe('Cliente Mayor');
      expect(cliente.tipo).toBe(TipoCliente.MAYORISTA);
      expect(cliente.precioDobleCrema?.value).toBe('4500');
      expect(cliente.precioSemisalado?.value).toBe('4000');
    });

    it('should create a MAYORISTA client without custom prices', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Mayor',
        tipo: TipoCliente.MAYORISTA,
      });
      expect(cliente.precioDobleCrema).toBeNull();
      expect(cliente.precioSemisalado).toBeNull();
    });
  });

  describe('constructor — MINORISTA', () => {
    it('should create a MINORISTA client', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Minor',
        tipo: TipoCliente.MINORISTA,
      });
      expect(cliente.nombre).toBe('Cliente Minor');
      expect(cliente.tipo).toBe(TipoCliente.MINORISTA);
    });
  });

  describe('constructor — validation', () => {
    it('should reject empty nombre', () => {
      expect(() => new Cliente({ nombre: '', tipo: TipoCliente.MINORISTA })).toThrow(
        'Cliente nombre is required'
      );
    });

    it('should reject whitespace-only nombre', () => {
      expect(() => new Cliente({ nombre: '   ', tipo: TipoCliente.MINORISTA })).toThrow(
        'Cliente nombre is required'
      );
    });
  });

  describe('resolvePrecio', () => {
    it('MAYORISTA with custom DOBLE_CREMA price should return custom price', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Mayor',
        tipo: TipoCliente.MAYORISTA,
        precioDobleCrema: '4500',
      });
      const price = cliente.resolvePrecio(TipoProducto.DOBLE_CREMA, new Dinero('5000'));
      expect(price.value).toBe('4500');
    });

    it('MAYORISTA with custom SEMISALADO price should return custom price', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Mayor',
        tipo: TipoCliente.MAYORISTA,
        precioSemisalado: '4000',
      });
      const price = cliente.resolvePrecio(TipoProducto.SEMISALADO, new Dinero('5000'));
      expect(price.value).toBe('4000');
    });

    it('MAYORISTA without custom price should fall back to standard price', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Mayor',
        tipo: TipoCliente.MAYORISTA,
      });
      const price = cliente.resolvePrecio(TipoProducto.DOBLE_CREMA, new Dinero('5000'));
      expect(price.value).toBe('5000');
    });

    it('MINORISTA should always use standard price', () => {
      const cliente = new Cliente({
        nombre: 'Cliente Minor',
        tipo: TipoCliente.MINORISTA,
        precioDobleCrema: '4500',
      });
      // Even with custom price set, MINORISTA uses standard
      const price = cliente.resolvePrecio(TipoProducto.DOBLE_CREMA, new Dinero('5000'));
      expect(price.value).toBe('5000');
    });
  });

  describe('updateNombre', () => {
    it('should return a new Cliente with updated nombre', () => {
      const cliente = new Cliente({
        id: 'c-1',
        nombre: 'Old Name',
        tipo: TipoCliente.MINORISTA,
      });
      const updated = cliente.updateNombre('New Name');
      expect(updated.nombre).toBe('New Name');
      expect(updated.id).toBe('c-1');
      expect(updated.tipo).toBe(TipoCliente.MINORISTA);
    });
  });

  describe('updatePrecio', () => {
    it('should update DOBLE_CREMA price', () => {
      const cliente = new Cliente({
        id: 'c-1',
        nombre: 'Test',
        tipo: TipoCliente.MAYORISTA,
      });
      const updated = cliente.updatePrecio(TipoProducto.DOBLE_CREMA, '4500');
      expect(updated.precioDobleCrema?.value).toBe('4500');
      expect(updated.precioSemisalado).toBeNull();
    });

    it('should update SEMISALADO price', () => {
      const cliente = new Cliente({
        id: 'c-1',
        nombre: 'Test',
        tipo: TipoCliente.MAYORISTA,
      });
      const updated = cliente.updatePrecio(TipoProducto.SEMISALADO, '4000');
      expect(updated.precioSemisalado?.value).toBe('4000');
      expect(updated.precioDobleCrema).toBeNull();
    });
  });
});