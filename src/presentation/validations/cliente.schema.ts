// Zod validation schema for Cliente — server-side only
import { z } from 'zod';
import { TipoCliente } from '@/domain/enums';

export const crearClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.nativeEnum(TipoCliente, { message: 'Seleccione un tipo de cliente' }),
  precioDobleCrema: z.string().optional(),
  precioSemisalado: z.string().optional(),
});

export const actualizarClienteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  precioDobleCrema: z.string().optional(),
  precioSemisalado: z.string().optional(),
});

export const eliminarClienteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
});