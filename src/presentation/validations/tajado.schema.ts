// Zod validation schema for Tajado creation — server-side only
import { z } from 'zod';

export const crearTajadoSchema = z.object({
  loteId: z.string().min(1, 'Seleccione un lote'),
  cantidadBloques: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioPorBloque: z.coerce.number().positive('El precio debe ser mayor a 0').default(1500),
  tajador: z.string().min(1, 'Ingrese el nombre del tajador'),
});