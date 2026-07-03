// Zod validation schema for Lote creation and modification — server-side only
import { z } from 'zod';
import { TipoProducto } from '@/domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';

export const crearLoteSchema = z.object({
  producto: z.nativeEnum(TipoProducto, { message: 'Seleccione un tipo de producto' }),
  proveedorId: z.string().min(1, 'Seleccione un proveedor'),
  cantidadCompradaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional().default(0),
  costoTajado: z.coerce.number().nonnegative('El tajado no puede ser negativo').optional().default(0),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional().default(0),
}).refine(
  (data) => {
    if (data.producto === TipoProducto.DOBLE_CREMA) {
      const remainder = Number((data.cantidadCompradaKg / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      return Math.abs(remainder) < 0.001;
    }
    return true;
  },
  {
    message: 'Para Doble Crema, la cantidad debe ser múltiplo de 2.5 kg',
    path: ['cantidadCompradaKg'],
  }
);

export const actualizarLoteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  version: z.coerce.number().int().min(1, 'Version es obligatoria'),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
  cantidadCompradaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0').optional(),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional(),
  costoTajado: z.coerce.number().nonnegative('El tajado no puede ser negativo').optional(),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional(),
}).refine(
  (data) => {
    // When updating a lote, the producto context is passed for cross-field validation
    if ((data as Record<string, unknown>).producto === TipoProducto.DOBLE_CREMA && data.cantidadCompradaKg !== undefined) {
      const remainder = Number((data.cantidadCompradaKg / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      return Math.abs(remainder) < 0.001;
    }
    return true;
  },
  {
    message: 'Para Doble Crema, la cantidad debe ser múltiplo de 2.5 kg',
    path: ['cantidadCompradaKg'],
  }
);