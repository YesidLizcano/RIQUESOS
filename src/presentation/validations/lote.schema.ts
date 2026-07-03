// Zod validation schema for Lote creation and modification — server-side only
import { z } from 'zod';
import { TipoProducto } from '@/domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';

export const crearLoteSchema = z.object({
  producto: z.nativeEnum(TipoProducto, { message: 'Seleccione un tipo de producto' }),
  proveedorId: z.string().min(1, 'Seleccione un proveedor'),
  cantidadCompradaKg: z.coerce.number().nonnegative('La cantidad no puede ser negativa').optional().default(0),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional().default(0),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional().default(0),
  bloquesEnteros: z.coerce.number().int().nonnegative('Los bloques enteros no pueden ser negativos').optional().default(0),
  bloquesTajadosDeFabrica: z.coerce.number().int().nonnegative('Los bloques tajados de fábrica no pueden ser negativos').optional().default(0),
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
);

export const actualizarLoteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  version: z.coerce.number().int().min(1, 'Version es obligatoria'),
  precioCompraBaseKg: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
  cantidadCompradaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0').optional(),
  costoFlete: z.coerce.number().nonnegative('El flete no puede ser negativo').optional(),
  costoEmpaques: z.coerce.number().nonnegative('Los empaques no pueden ser negativos').optional(),
});