// Zod validation schema for Lote creation and modification — server-side only
import { z } from 'zod';
import { TipoProducto, EstadoPagoLote } from '@/domain/enums';

/** Valid payment methods for lotes — CREDITO is NOT allowed for lotes (only for Ventas) */
export const LOTE_METODOS_PAGO = ['EFECTIVO', 'NEQUI', 'BRE_B'] as const;
export type LoteMetodoPago = (typeof LOTE_METODOS_PAGO)[number];

// Per-item schema for batch creation (shared between crearLoteSchema and crearLotesBatchSchema)
const crearLoteItemSchema = z.object({
  producto: z.nativeEnum(TipoProducto, { message: 'Seleccione un tipo de producto' }),
  cantidadCompradaKg: z.coerce.number().nonnegative('La cantidad no puede ser negativa').optional().default(0),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo').optional().default(0),
  precioPorBloqueEntero: z.coerce.number().nonnegative('El precio por bloque entero no puede ser negativo').optional().default(0),
  precioPorBloqueTajado: z.coerce.number().nonnegative('El precio por bloque tajado no puede ser negativo').optional().default(0),
  bloquesEnteros: z.coerce.number().int().nonnegative('Los bloques enteros no pueden ser negativos').optional().default(0),
  bloquesTajadosDeFabrica: z.coerce.number().int().nonnegative('Los bloques tajados de fábrica no pueden ser negativos').optional().default(0),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional().default(0),
}).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA) {
      return data.bloquesEnteros + data.bloquesTajadosDeFabrica > 0;
    }
    return data.cantidadCompradaKg > 0;
  },
  {
    message: 'Para Doble Crema debe ingresar al menos un bloque. Para Semisalado, la cantidad debe ser mayor a 0.',
    path: ['bloquesEnteros'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA && data.bloquesEnteros > 0) {
      return data.precioPorBloqueEntero > 0;
    }
    return true;
  },
  {
    message: 'Si hay bloques enteros, el precio por bloque entero es obligatorio',
    path: ['precioPorBloqueEntero'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA && data.bloquesTajadosDeFabrica > 0) {
      return data.precioPorBloqueTajado > 0;
    }
    return true;
  },
  {
    message: 'Si hay bloques tajados de fábrica, el precio por bloque tajado es obligatorio',
    path: ['precioPorBloqueTajado'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.SEMISALADO) {
      return data.precioCompraBaseKg > 0;
    }
    return true;
  },
  {
    message: 'Para Semisalado, el precio base por kg es obligatorio',
    path: ['precioCompraBaseKg'],
  }
);

export const crearLoteSchema = z.object({
  producto: z.nativeEnum(TipoProducto, { message: 'Seleccione un tipo de producto' }),
  proveedorId: z.string().min(1, 'Seleccione un proveedor'),
  cantidadCompradaKg: z.coerce.number().nonnegative('La cantidad no puede ser negativa').optional().default(0),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo').optional().default(0),
  precioPorBloqueEntero: z.coerce.number().nonnegative('El precio por bloque entero no puede ser negativo').optional().default(0),
  precioPorBloqueTajado: z.coerce.number().nonnegative('El precio por bloque tajado no puede ser negativo').optional().default(0),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional().default(0),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional().default(0),
  bloquesEnteros: z.coerce.number().int().nonnegative('Los bloques enteros no pueden ser negativos').optional().default(0),
  bloquesTajadosDeFabrica: z.coerce.number().int().nonnegative('Los bloques tajados de fábrica no pueden ser negativos').optional().default(0),
  estadoPago: z.nativeEnum(EstadoPagoLote).optional().default(EstadoPagoLote.PENDIENTE),
  metodoPagoLote: z.enum(LOTE_METODOS_PAGO).optional().default('EFECTIVO'),
}).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA) {
      return data.bloquesEnteros + data.bloquesTajadosDeFabrica > 0;
    }
    return data.cantidadCompradaKg > 0;
  },
  {
    message: 'Para Doble Crema debe ingresar al menos un bloque. Para Semisalado, la cantidad debe ser mayor a 0.',
    path: ['bloquesEnteros'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA && data.bloquesEnteros > 0) {
      return data.precioPorBloqueEntero > 0;
    }
    return true;
  },
  {
    message: 'Si hay bloques enteros, el precio por bloque entero es obligatorio',
    path: ['precioPorBloqueEntero'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA && data.bloquesTajadosDeFabrica > 0) {
      return data.precioPorBloqueTajado > 0;
    }
    return true;
  },
  {
    message: 'Si hay bloques tajados de fábrica, el precio por bloque tajado es obligatorio',
    path: ['precioPorBloqueTajado'],
  }
).refine(
  (data) => {
    if (data.producto === TipoProducto.SEMISALADO) {
      return data.precioCompraBaseKg > 0;
    }
    return true;
  },
  {
    message: 'Para Semisalado, el precio base por kg es obligatorio',
    path: ['precioCompraBaseKg'],
  }
);

export const crearLotesBatchSchema = z.object({
  proveedorId: z.string().min(1, 'Proveedor es obligatorio'),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional().default(0),
  estadoPago: z.nativeEnum(EstadoPagoLote).optional().default(EstadoPagoLote.PENDIENTE),
  metodoPagoLote: z.enum(LOTE_METODOS_PAGO).optional().default('EFECTIVO'),
  items: z.array(crearLoteItemSchema).min(1, 'Debe agregar al menos un producto'),
});

export const actualizarLoteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  version: z.coerce.number().int().min(1, 'Version es obligatoria'),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
  precioPorBloqueEntero: z.coerce.number().nonnegative('El precio por bloque entero no puede ser negativo').optional(),
  precioPorBloqueTajado: z.coerce.number().nonnegative('El precio por bloque tajado no puede ser negativo').optional(),
  cantidadCompradaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0').optional(),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional(),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional(),
  estadoPago: z.nativeEnum(EstadoPagoLote).optional(),
  metodoPagoLote: z.enum(LOTE_METODOS_PAGO).optional(),
});