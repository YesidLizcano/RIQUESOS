import { describe, it, expect } from 'vitest';
import { PrecioClienteProveedor } from './PrecioClienteProveedor';

describe('PrecioClienteProveedor', () => {
  it('should create with required fields', () => {
    const precio = new PrecioClienteProveedor({
      clienteId: 'cliente-1',
      proveedorId: 'proveedor-1',
      precioEntero: '5000',
      precioTajado: '5500',
    });

    expect(precio.clienteId).toBe('cliente-1');
    expect(precio.proveedorId).toBe('proveedor-1');
    expect(precio.precioEntero.value).toBe('5000');
    expect(precio.precioTajado.value).toBe('5500');
  });

  it('should default precioEntero and precioTajado to 0', () => {
    const precio = new PrecioClienteProveedor({
      clienteId: 'c1',
      proveedorId: 'p1',
      precioEntero: '',
      precioTajado: '',
    });

    expect(precio.precioEntero.value).toBe('0');
    expect(precio.precioTajado.value).toBe('0');
  });

  it('should accept id and timestamps', () => {
    const now = new Date();
    const precio = new PrecioClienteProveedor({
      id: 'precio-1',
      clienteId: 'c1',
      proveedorId: 'p1',
      precioEntero: '3000',
      precioTajado: '3500',
      createdAt: now,
      updatedAt: now,
    });

    expect(precio.id).toBe('precio-1');
    expect(precio.createdAt).toBe(now);
    expect(precio.updatedAt).toBe(now);
  });

  it('should handle numeric precio values', () => {
    const precio = new PrecioClienteProveedor({
      clienteId: 'c1',
      proveedorId: 'p1',
      precioEntero: '12500.50',
      precioTajado: '13000.75',
    });

    expect(precio.precioEntero.value).toBe('12500.50');
    expect(precio.precioTajado.value).toBe('13000.75');
  });

  it('should default valorDomicilio and costoDomiciliario to 0', () => {
    const precio = new PrecioClienteProveedor({
      clienteId: 'c1',
      proveedorId: 'p1',
      precioEntero: '5000',
      precioTajado: '5500',
    });

    expect(precio.valorDomicilio.value).toBe('0');
    expect(precio.costoDomiciliario.value).toBe('0');
  });

  it('should accept valorDomicilio and costoDomiciliario', () => {
    const precio = new PrecioClienteProveedor({
      clienteId: 'c1',
      proveedorId: 'p1',
      precioEntero: '5000',
      precioTajado: '5500',
      valorDomicilio: '3000',
      costoDomiciliario: '1500',
    });

    expect(precio.valorDomicilio.value).toBe('3000');
    expect(precio.costoDomiciliario.value).toBe('1500');
  });
});