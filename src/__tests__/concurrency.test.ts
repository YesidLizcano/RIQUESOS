import { describe, it, expect, vi } from 'vitest';
import { ConcurrencyError } from '../domain/errors/ConcurrencyError';

describe('ConcurrencyError', () => {
  it('should have the correct name', () => {
    const error = new ConcurrencyError();
    expect(error.name).toBe('ConcurrencyError');
  });

  it('should use default message', () => {
    const error = new ConcurrencyError();
    expect(error.message).toBe('Record was modified by another transaction');
  });

  it('should accept custom message', () => {
    const error = new ConcurrencyError('Custom conflict message');
    expect(error.message).toBe('Custom conflict message');
  });

  it('should be an instance of Error', () => {
    const error = new ConcurrencyError();
    expect(error).toBeInstanceOf(Error);
  });

  it('should be detectable via instanceof', () => {
    const error = new ConcurrencyError('version conflict');
    expect(error instanceof ConcurrencyError).toBe(true);
  });

  it('should be detectable via error.name check in use case retry logic', () => {
    const error = new ConcurrencyError('Lote l-1 was modified');
    
    // Simulate the check used in RegistrarVenta use case
    expect(error.name === 'ConcurrencyError' || error.message.includes('modified by another transaction')).toBe(true);
  });

  it('should be detectable via message check in use case retry logic', () => {
    const error = new Error('Lote was modified by another transaction (expected version 1)');
    
    // Simulate the check used in RegistrarVenta use case
    expect(
      error.name === 'ConcurrencyError' || error.message.includes('modified by another transaction')
    ).toBe(true);
  });
});