// Human-readable labels for domain enums — single source of truth for UI display

import { TipoProducto, TipoCliente, EstadoLote, RolUsuario, CategoriaInsumo, MetodoPago, OrigenCorte, EstadoPagoLote, EstadoPagoTajado, OrigenTajadoGranel } from './enums';

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

export const categoriaInsumoLabel: Record<CategoriaInsumo, string> = {
  [CategoriaInsumo.BOLSA]: 'Bolsa',
  [CategoriaInsumo.SEPARADOR]: 'Separador',
};

export const metodoPagoLabel: Record<MetodoPago, string> = {
  [MetodoPago.EFECTIVO]: 'Efectivo',
  [MetodoPago.NEQUI]: 'Nequi',
  [MetodoPago.BRE_B]: 'Bre-B',
  [MetodoPago.CREDITO]: 'Crédito',
};

export const origenCorteLabel: Record<OrigenCorte, string> = {
  [OrigenCorte.ENTERO]: 'Entero',
  [OrigenCorte.TAJADO]: 'Tajado',
};

export const estadoPagoLoteLabel: Record<EstadoPagoLote, string> = {
  [EstadoPagoLote.PENDIENTE]: 'Pendiente',
  [EstadoPagoLote.PAGADO]: 'Pagado',
};

export const estadoPagoTajadoLabel: Record<EstadoPagoTajado, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
};

export const origenTajadoGranelLabel: Record<OrigenTajadoGranel, string> = {
  [OrigenTajadoGranel.INTERNO]: 'Interno',
  [OrigenTajadoGranel.FABRICA]: 'Fábrica',
};