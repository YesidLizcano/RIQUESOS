import { describe, it, expect } from 'vitest';
import { Proveedor } from './Proveedor';

describe('Proveedor', () => {
  describe('constructor', () => {
    it('should create a Proveedor with valid data', () => {
      const prov = new Proveedor({ nombre: 'Quesos del Valle' });
      expect(prov.nombre).toBe('Quesos del Valle');
      expect(prov.telefono).toBeNull();
    });

    it('should create a Proveedor with telefono', () => {
      const prov = new Proveedor({ nombre: 'Quesos del Valle', telefono: '351-555-1234' });
      expect(prov.telefono).toBe('351-555-1234');
    });

    it('should default id to empty string', () => {
      const prov = new Proveedor({ nombre: 'Test' });
      expect(prov.id).toBe('');
    });

    it('should accept provided id', () => {
      const prov = new Proveedor({ id: 'prov-1', nombre: 'Test' });
      expect(prov.id).toBe('prov-1');
    });
  });

  describe('validation', () => {
    it('should reject empty nombre', () => {
      expect(() => new Proveedor({ nombre: '' })).toThrow('Proveedor nombre is required');
    });

    it('should reject whitespace-only nombre', () => {
      expect(() => new Proveedor({ nombre: '   ' })).toThrow('Proveedor nombre is required');
    });
  });

  describe('updateNombre', () => {
    it('should return a new Proveedor with updated nombre', () => {
      const prov = new Proveedor({ id: 'prov-1', nombre: 'Old Name' });
      const updated = prov.updateNombre('New Name');
      expect(updated.nombre).toBe('New Name');
      expect(updated.id).toBe('prov-1');
    });
  });

  describe('updateTelefono', () => {
    it('should return a new Proveedor with updated telefono', () => {
      const prov = new Proveedor({ id: 'prov-1', nombre: 'Test' });
      const updated = prov.updateTelefono('351-555-9999');
      expect(updated.telefono).toBe('351-555-9999');
      expect(updated.nombre).toBe('Test');
    });
  });
});