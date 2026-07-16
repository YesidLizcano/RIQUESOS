// Zod validation schema for Tajado creation — server-side only
import { z } from 'zod';

export const crearTajadoSchema = z.object({
  loteId: z.string().min(1, 'Seleccione un lote'),
  cantidadBloques: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioPorBloque: z.coerce.number().positive('El precio debe ser mayor a 0').default(1500),
  tajador: z.string().trim().min(1, 'Ingrese el nombre del tajador').max(100, 'El nombre del tajador no puede superar 100 caracteres'),
  separadoresKg: z.coerce.number().nonnegative('Los kg de separadores no pueden ser negativos').default(0),
  recortesKg: z.coerce.number().nonnegative('Los kg de recortes no pueden ser negativos').default(0),
});