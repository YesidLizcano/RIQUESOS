// Zod validation schema for Cliente — server-side only
import { z } from 'zod';
import { TipoCliente } from '@/domain/enums';

export const crearClienteSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres'),
  tipo: z.nativeEnum(TipoCliente, { message: 'Seleccione un tipo de cliente' }),
  precioDobleCremaEntero: z.string().optional(),
  precioDobleCremaTajado: z.string().optional(),
  precioSemisalado: z.string().optional(),
  valorDomicilio: z.string().optional(),
});

export const actualizarClienteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres').optional(),
  precioDobleCremaEntero: z.string().optional(),
  precioDobleCremaTajado: z.string().optional(),
  precioSemisalado: z.string().optional(),
  valorDomicilio: z.string().optional(),
});

export const eliminarClienteSchema = z.object({
  id: z.string().min(1, 'ID es obligatorio'),
});