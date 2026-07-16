import { describe, it, expect } from 'vitest';
import { Sede } from './Sede';

describe('Sede', () => {
  describe('constructor', () => {
    it('should create a Sede with valid data', () => {
      const sede = new Sede({ nombre: 'Sucursal Centro', clienteId: 'cliente-1' });
      expect(sede.nombre).toBe('Sucursal Centro');
      expect(sede.clienteId).toBe('cliente-1');
      expect(sede.direccion).toBeNull();
      expect(sede.telefono).toBeNull();
      expect(sede.esPrincipal).toBe(false);
    });

    it('should create a Sede with all optional fields', () => {
      const sede = new Sede({
        nombre: 'Bodega Norte',
        direccion: 'Calle 123',
        telefono: '351-555-1234',
        esPrincipal: true,
        clienteId: 'cliente-1',
      });
      expect(sede.direccion).toBe('Calle 123');
      expect(sede.telefono).toBe('351-555-1234');
      expect(sede.esPrincipal).toBe(true);
    });

    it('should default id to empty string', () => {
      const sede = new Sede({ nombre: 'Test', clienteId: 'c-1' });
      expect(sede.id).toBe('');
    });

    it('should accept provided id', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1' });
      expect(sede.id).toBe('sede-1');
    });
  });

  describe('validation', () => {
    it('should reject empty nombre', () => {
      expect(() => new Sede({ nombre: '', clienteId: 'c-1' })).toThrow('Sede nombre is required');
    });

    it('should reject whitespace-only nombre', () => {
      expect(() => new Sede({ nombre: '   ', clienteId: 'c-1' })).toThrow('Sede nombre is required');
    });

    it('should reject missing clienteId', () => {
      expect(() => new Sede({ nombre: 'Test', clienteId: '' })).toThrow('Sede clienteId is required');
    });
  });

  describe('updateNombre', () => {
    it('should return a new Sede with updated nombre', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Old Name', clienteId: 'c-1' });
      const updated = sede.updateNombre('New Name');
      expect(updated.nombre).toBe('New Name');
      expect(updated.id).toBe('sede-1');
    });
  });

  describe('updateDireccion', () => {
    it('should return a new Sede with updated direccion', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1' });
      const updated = sede.updateDireccion('New Address');
      expect(updated.direccion).toBe('New Address');
    });
  });

  describe('updateTelefono', () => {
    it('should return a new Sede with updated telefono', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1' });
      const updated = sede.updateTelefono('555-1234');
      expect(updated.telefono).toBe('555-1234');
    });
  });

  describe('setPrincipal', () => {
    it('should return a new Sede with esPrincipal set to true', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1' });
      const updated = sede.setPrincipal(true);
      expect(updated.esPrincipal).toBe(true);
    });

    it('should return a new Sede with esPrincipal set to false', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', esPrincipal: true, clienteId: 'c-1' });
      const updated = sede.setPrincipal(false);
      expect(updated.esPrincipal).toBe(false);
    });
  });

  describe('softDelete / restore', () => {
    it('should set deletedAt to a Date on softDelete', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1' });
      const deleted = sede.softDelete();
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should set deletedAt to null on restore', () => {
      const sede = new Sede({ id: 'sede-1', nombre: 'Test', clienteId: 'c-1', deletedAt: new Date() });
      const restored = sede.restore();
      expect(restored.deletedAt).toBeNull();
    });
  });
});