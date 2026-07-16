// Human-readable labels for domain enums — single source of truth for UI display

import { TipoProducto, TipoCliente, EstadoLote, RolUsuario, CategoriaInsumo, MetodoPago, OrigenCorte } from './enums';

export const tipoProductoLabel: Record<TipoProducto, string> = {
  [TipoProducto.DOBLE_CREMA]: 'Doble Crema',
  [TipoProducto.SEMISALADO]: 'Semisalado',
  [TipoProducto.RECORTES_DOBLE_CREMA]: 'Recortes DC',
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

export const categoriaInsumoLabel: Record<CategoriaInsumo, string> = {
  [CategoriaInsumo.BOLSA]: 'Bolsa',
  [CategoriaInsumo.SEPARADOR]: 'Separador',
};

export const metodoPagoLabel: Record<string, string> = {
  [MetodoPago.EFECTIVO]: 'Efectivo',
  [MetodoPago.NEQUI]: 'Nequi',
  [MetodoPago.BRE_B]: 'Bre-B',
  [MetodoPago.CREDITO]: 'Crédito',
};

export const origenCorteLabel: Record<string, string> = {
  [OrigenCorte.ENTERO]: 'Entero',
  [OrigenCorte.TAJADO]: 'Tajado',
};