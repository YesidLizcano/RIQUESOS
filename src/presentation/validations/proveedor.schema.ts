// Zod validation schema for Proveedor — server-side only
import { z } from 'zod';

export const crearProveedorSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres'),
  telefono: z.string().trim().max(20, 'El teléfono no puede superar 20 caracteres').optional(),
});

export const actualizarProveedorSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres').optional(),
  telefono: z.string().trim().max(20, 'El teléfono no puede superar 20 caracteres').optional(),
});

export const eliminarProveedorSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
});