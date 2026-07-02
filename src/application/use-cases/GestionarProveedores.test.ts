import { describe, it, expect, vi } from 'vitest';
import { GestionarProveedores } from './GestionarProveedores';
import { Proveedor } from '../../domain/entities/Proveedor';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

describe('GestionarProveedores', () => {
  const mockProveedorRepo: ProveedorRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new GestionarProveedores(mockProveedorRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('actualizar', () => {
    it('should update nombre', async () => {
      const existing = new Proveedor({ id: 'prov-1', nombre: 'Viejo Nombre', telefono: '1234' });
      const updated = new Proveedor({ id: 'prov-1', nombre: 'Nuevo Nombre', telefono: '1234' });

      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (mockProveedorRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await useCase.actualizar({ id: 'prov-1', nombre: 'Nuevo Nombre' });

      expect(result.nombre).toBe('Nuevo Nombre');
      expect(mockProveedorRepo.findById).toHaveBeenCalledWith('prov-1');
      expect(mockProveedorRepo.save).toHaveBeenCalled();
    });

    it('should update telefono', async () => {
      const existing = new Proveedor({ id: 'prov-1', nombre: 'Test Prov', telefono: '1234' });
      const updated = new Proveedor({ id: 'prov-1', nombre: 'Test Prov', telefono: '5678' });

      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (mockProveedorRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await useCase.actualizar({ id: 'prov-1', telefono: '5678' });

      expect(result.telefono).toBe('5678');
    });

    it('should throw error when proveedor not found', async () => {
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        useCase.actualizar({ id: 'nonexistent', nombre: 'Test' })
      ).rejects.toThrow('Proveedor not found: nonexistent');
    });
  });

  describe('eliminar', () => {
    it('should delete a proveedor', async () => {
      const existing = new Proveedor({ id: 'prov-1', nombre: 'Test Prov' });
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (mockProveedorRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await useCase.eliminar('prov-1');

      expect(mockProveedorRepo.delete).toHaveBeenCalledWith('prov-1');
    });

    it('should throw error when proveedor not found for deletion', async () => {
      (mockProveedorRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(useCase.eliminar('nonexistent')).rejects.toThrow('Proveedor not found: nonexistent');
    });
  });
});