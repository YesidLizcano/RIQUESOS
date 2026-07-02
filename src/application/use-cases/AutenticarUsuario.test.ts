import { describe, it, expect, vi } from 'vitest';
import { AutenticarUsuario } from './AutenticarUsuario';
import { Usuario } from '../../domain/entities/Usuario';
import { RolUsuario } from '../../domain/enums';
import type { UsuarioRepository } from '../../domain/ports/UsuarioRepository';

describe('AutenticarUsuario', () => {
  const mockUsuarioRepo: UsuarioRepository = {
    findByEmail: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    findDeleted: vi.fn(),
  };

  // Mock verifyPassword function
  const mockVerifyPassword = vi.fn();

  const useCase = new AutenticarUsuario(mockUsuarioRepo, mockVerifyPassword);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const adminUser = new Usuario({
    id: 'user-1',
    email: 'admin@riquesos.com',
    passwordHash: '$2b$10$hashedpassword',
    role: RolUsuario.ADMIN,
  });

  it('should return success with valid credentials', async () => {
    (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(adminUser);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await useCase.execute('admin@riquesos.com', 'admin123');

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user!.email).toBe('admin@riquesos.com');
    expect(result.user!.role).toBe(RolUsuario.ADMIN);
    expect(result.user!.id).toBe('user-1');
    // Never expose passwordHash
    expect((result.user as Record<string, unknown>)['passwordHash']).toBeUndefined();
  });

  it('should reject with wrong password', async () => {
    (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(adminUser);
    mockVerifyPassword.mockResolvedValue(false);

    const result = await useCase.execute('admin@riquesos.com', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(result.user).toBeUndefined();
  });

  it('should reject with unknown email', async () => {
    (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await useCase.execute('unknown@riquesos.com', 'anypassword');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(result.user).toBeUndefined();
  });

  it('should reject with empty email', async () => {
    const result = await useCase.execute('', 'password');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email and password are required');
  });

  it('should reject with empty password', async () => {
    const result = await useCase.execute('admin@riquesos.com', '');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email and password are required');
  });

  it('should call verifyPassword with plain password and stored hash', async () => {
    (mockUsuarioRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(adminUser);
    mockVerifyPassword.mockResolvedValue(true);

    await useCase.execute('admin@riquesos.com', 'admin123');

    expect(mockVerifyPassword).toHaveBeenCalledWith('admin123', '$2b$10$hashedpassword');
  });
});