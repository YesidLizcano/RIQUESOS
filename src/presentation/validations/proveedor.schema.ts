// Zod validation schema for Proveedor — server-side only
import { z } from 'zod';

export const crearProveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().optional(),
});

export const actualizarProveedorSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  telefono: z.string().optional(),
});

export const eliminarProveedorSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
});