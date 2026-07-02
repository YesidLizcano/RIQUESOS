// Zod validation schema for GastoFijo — server-side only
import { z } from 'zod';

export const crearGastoFijoSchema = z.object({
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  valor: z.coerce.number().nonnegative('El valor no puede ser negativo'),
});

export const actualizarGastoFijoSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  concepto: z.string().min(1, 'El concepto es obligatorio').optional(),
  valor: z.coerce.number().nonnegative('El valor no puede ser negativo').optional(),
});

export const eliminarGastoFijoSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
});