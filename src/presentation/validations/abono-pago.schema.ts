// Zod validation schema for AbonoPago registration — server-side only
import { z } from 'zod';

export const registrarAbonoPagoSchema = z.object({
  ventaId: z.string().min(1, 'Seleccione una venta'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['EFECTIVO', 'NEQUI', 'BRE_B'], {
    message: 'Seleccione un método de pago válido',
  }),
  observacion: z.string().trim().max(200, 'La observación no puede superar 200 caracteres').optional(),
});