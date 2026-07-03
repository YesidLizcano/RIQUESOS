// Human-readable labels for domain enums — single source of truth for UI display

import { TipoProducto, TipoCliente, EstadoLote, RolUsuario } from './enums';

export const tipoProductoLabel: Record<TipoProducto, string> = {
  [TipoProducto.DOBLE_CREMA]: 'Doble Crema',
  [TipoProducto.SEMISALADO]: 'Semisalado',
};

export const tipoClienteLabel: Record<TipoCliente, string> = {
  [TipoCliente.MAYORISTA]: 'Mayorista',
  [TipoCliente.MINORISTA]: 'Minorista',
};

export const estadoLoteLabel: Record<EstadoLote, string> = {
  [EstadoLote.ACTIVO]: 'Activo',
  [EstadoLote.AGOTADO]: 'Agotado',
};

export const rolUsuarioLabel: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]: 'Administrador',
  [RolUsuario.USER]: 'Usuario',
};