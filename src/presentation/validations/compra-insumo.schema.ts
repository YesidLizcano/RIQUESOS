// Zod validation schema for CompraInsumo registration — server-side only
import { z } from 'zod';

export const registrarCompraSchema = z.object({
  empaqueId: z.string().min(1, 'Seleccione un insumo'),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});