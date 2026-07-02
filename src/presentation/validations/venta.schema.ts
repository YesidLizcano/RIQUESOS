// Zod validation schema for Venta registration — server-side only
import { z } from 'zod';

export const registrarVentaSchema = z.object({
  clienteId: z.string().min(1, 'Seleccione un cliente'),
  loteId: z.string().min(1, 'Seleccione un lote'),
  cantidadVendidaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  standardPricePerKg: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  valorDomicilio: z.coerce.number().nonnegative('El valor del domicilio no puede ser negativo').optional().default(0),
  domiciliario: z.string().optional(),
});