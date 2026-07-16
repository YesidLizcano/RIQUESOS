// Zod validation schema for Empaque (Insumo) creation and modification — server-side only
import { z } from 'zod';
import { CategoriaInsumo } from '@/domain/enums';

export const crearEmpaqueSchema = z.object({
  categoria: z.nativeEnum(CategoriaInsumo, { message: 'La categoría es obligatoria' }),
  stock: z.coerce.number().nonnegative('El stock no puede ser negativo'),
  precio: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});

export const actualizarEmpaqueSchema = z.object({
  id: z.string().min(1, 'ID obligatorio'),
  categoria: z.nativeEnum(CategoriaInsumo).optional(),
  stock: z.coerce.number().nonnegative('El stock no puede ser negativo').optional(),
  precio: z.coerce.number().nonnegative('El precio no puede ser negativo').optional(),
});