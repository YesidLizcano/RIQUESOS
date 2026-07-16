// Domain Enums — no external imports allowed

export enum TipoProducto {
  DOBLE_CREMA = 'DOBLE_CREMA',
  SEMISALADO = 'SEMISALADO',
  RECORTES_DOBLE_CREMA = 'RECORTES_DOBLE_CREMA',
}

export enum TipoCliente {
  MAYORISTA = 'MAYORISTA',
  MINORISTA = 'MINORISTA',
}

export enum EstadoLote {
  ACTIVO = 'ACTIVO',
  AGOTADO = 'AGOTADO',
}

export enum EstadoPagoLote {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
}

export const ESTADO_PAGO_TAJADO = {
  PENDIENTE: 'PENDIENTE',
  PAGADO: 'PAGADO',
} as const;

export type EstadoPagoTajado = typeof ESTADO_PAGO_TAJADO[keyof typeof ESTADO_PAGO_TAJADO];

export enum RolUsuario {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum CategoriaInsumo {
  BOLSA = 'BOLSA',
  SEPARADOR = 'SEPARADOR',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  NEQUI = 'NEQUI',
  BRE_B = 'BRE_B',
  CREDITO = 'CREDITO',
}

export enum OrigenCorte {
  ENTERO = 'ENTERO',
  TAJADO = 'TAJADO',
}

/** When origenCorte=TAJADO for DC granel, which tajado pool to deduct from */
export enum OrigenTajadoGranel {
  INTERNO = 'INTERNO',
  FABRICA = 'FABRICA',
}

/** Valid payment methods for abono on CREDITO ventas — excludes CREDITO itself */
export type MetodoPagoAbono = Exclude<MetodoPago, MetodoPago.CREDITO>;