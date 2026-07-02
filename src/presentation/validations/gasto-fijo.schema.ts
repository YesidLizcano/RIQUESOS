// Zod validation schema for GastoFijo creation — server-side only
import { z } from 'zod';

export const crearGastoFijoSchema = z.object({
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  valor: z.coerce.number().nonnegative('El valor no puede ser negativo'),
});