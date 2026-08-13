// Domain mappers — type-safe enum conversion from Prisma string values
// Prisma returns enum fields as strings, but our domain uses TypeScript enums.
// These functions validate the string is a valid enum member at runtime.

import {
  TipoProducto,
  TipoCliente,
  EstadoLote,
  EstadoPagoLote,
  MetodoPago,
  RolUsuario,
} from './enums';

function asEnum<T extends Record<string, string>>(
  value: string | null | undefined,
  enumObj: T,
  fieldName: string,
): T[keyof T] {
  if (value == null) {
    throw new Error(`Invalid ${fieldName}: value is null/undefined. Expected one of: ${Object.values(enumObj).join(', ')}`);
  }
  const values = Object.values(enumObj) as string[];
  if (!values.includes(value)) {
    throw new Error(`Invalid ${fieldName}: "${value}". Expected one of: ${values.join(', ')}`);
  }
  return value as T[keyof T];
}

export function asTipoProducto(value: string): TipoProducto {
  return asEnum(value, TipoProducto, 'TipoProducto');
}

export function asTipoCliente(value: string): TipoCliente {
  return asEnum(value, TipoCliente, 'TipoCliente');
}

export function asEstadoLote(value: string): EstadoLote {
  return asEnum(value, EstadoLote, 'EstadoLote');
}

export function asEstadoPagoLote(value: string): EstadoPagoLote {
  return asEnum(value, EstadoPagoLote, 'EstadoPagoLote');
}

export function asMetodoPago(value: string): MetodoPago {
  return asEnum(value, MetodoPago, 'MetodoPago');
}

export function asRolUsuario(value: string): RolUsuario {
  return asEnum(value, RolUsuario, 'RolUsuario');
}