// Zod validation schema for Empaque creation and modification — server-side only
import { z } from 'zod';

export const crearEmpaqueSchema = z.object({
  tipo: z.string().min(1, 'El tipo de empaque es obligatorio'),
  stock: z.coerce.number().int().nonnegative('El stock no puede ser negativo'),
  precio: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});

export const actualizarEmpaqueSchema = z.object({
  id: z.string().min(1, 'ID obligatorio'),
  tipo: z.string().min(1, 'El tipo es obligatorio').optional(),
  stock: z.coerce.number().int().nonnegative('El stock no puede ser negativo').optional(),
  precio: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
});