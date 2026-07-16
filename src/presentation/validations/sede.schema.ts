// Zod validation schema for Sede — server-side only
import { z } from 'zod';

export const crearSedeSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres'),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  esPrincipal: z.boolean().optional(),
  clienteId: z.string().min(1, 'El cliente es obligatorio'),
});

export const actualizarSedeSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres').optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  esPrincipal: z.boolean().optional(),
});