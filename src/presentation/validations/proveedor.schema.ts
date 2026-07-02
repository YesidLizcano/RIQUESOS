// Zod validation schema for Proveedor creation — server-side only
import { z } from 'zod';

export const crearProveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().optional(),
});