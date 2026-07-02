import { describe, it, expect, vi } from 'vitest';
import { AutenticarUsuario } from '../application/use-cases/AutenticarUsuario';
import { Usuario } from '../domain/entities/Usuario';
import { RolUsuario } from '../domain/enums';
import type { UsuarioRepository } from '../domain/ports/UsuarioRepository';

/**
 * Auth unit tests — focused on authentication scenarios:
 * - Valid login (already tested in AutenticarUsuario.test.ts)
 * - Wrong password
 * - Unknown email
 * - Empty credentials
 *
 * These tests duplicate the Auth scenarios from the spec for completeness.
 */
describe('Auth unit tests', () => {
  const mockUsuarioRepo: UsuarioRepository = {
    findByEmail: vi.fn(),
    save: vi.fn(),
  };

  const mockVerifyPassword = vi.fn();

  const useCase = new AutenticarUsuario(mockUsuarioRepo, mockVerifyPassword);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid login', () => {
    it('should authenticate user with correct credentials', async () => {
      const user = new Usuario({
        id: 'user-1',
        email: 'admin@riquesos.com',
        passwordHash: '$2b$10$validhash',
        role: RolUsuario.ADMIN,
      });

      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      mockVerifyPassword.mockResolvedValue(true);

      const result = await useCase.execute('admin@riquesos.com', 'admin123');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('admin@riquesos.com');
      expect(result.user?.role).toBe(RolUsuario.ADMIN);
    });
  });

  describe('wrong password', () => {
    it('should reject authentication with wrong password', async () => {
      const user = new Usuario({
        id: 'user-1',
        email: 'admin@riquesos.com',
        passwordHash: '$2b$10$validhash',
        role: RolUsuario.ADMIN,
      });

      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      mockVerifyPassword.mockResolvedValue(false);

      const result = await useCase.execute('admin@riquesos.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      // Verify that verifyPassword was called with the plain password and hash
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrongpassword', '$2b$10$validhash');
    });
  });

  describe('unknown email', () => {
    it('should reject authentication with unknown email', async () => {
      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCase.execute('unknown@example.com', 'anypassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      // Verify that verifyPassword was NOT called (no user found)
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('empty credentials', () => {
    it('should reject authentication with empty email', async () => {
      const result = await useCase.execute('', 'password');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should reject authentication with empty password', async () => {
      const result = await useCase.execute('admin@riquesos.com', '');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });
  });

  describe('security', () => {
    it('should not expose passwordHash in successful auth result', async () => {
      const user = new Usuario({
        id: 'user-1',
        email: 'admin@riquesos.com',
        passwordHash: '$2b$10$secret',
        role: RolUsuario.ADMIN,
      });

      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      mockVerifyPassword.mockResolvedValue(true);

      const result = await useCase.execute('admin@riquesos.com', 'admin123');

      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should not leak whether email exists vs wrong password (same error message)', async () => {
      // Unknown email
      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result1 = await useCase.execute('unknown@example.com', 'password');

      // Wrong password
      const user = new Usuario({
        id: 'user-1',
        email: 'admin@riquesos.com',
        passwordHash: '$2b$10$validhash',
        role: RolUsuario.ADMIN,
      });
      (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      mockVerifyPassword.mockResolvedValue(false);
      const result2 = await useCase.execute('admin@riquesos.com', 'wrongpassword');

      // Both should return the same error message (no user enumeration)
      expect(result1.error).toBe('Invalid credentials');
      expect(result2.error).toBe('Invalid credentials');
    });
  });
});