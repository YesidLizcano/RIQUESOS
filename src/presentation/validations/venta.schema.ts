// Zod validation schema for Venta registration — server-side only
import { z } from 'zod';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';

export const registrarVentaSchema = z.object({
  clienteId: z.string().min(1, 'Seleccione un cliente'),
  loteId: z.string().min(1, 'Seleccione un lote'),
  cantidadVendidaKg: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  standardPricePerKg: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  valorDomicilio: z.coerce.number().nonnegative('El valor del domicilio no puede ser negativo').optional().default(0),
  domiciliario: z.string().optional(),
  ventaTipo: z.enum(['BLOQUES', 'GRANEL']).optional().default('GRANEL'),
}).refine(
  // Block constraint: BLOQUES mode requires integer block count (multiple of 2.5 kg)
  (data) => {
    if (data.ventaTipo === 'BLOQUES') {
      const remainder = Number((data.cantidadVendidaKg / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      return Math.abs(remainder) < 0.001;
    }
    return true;
  },
  { message: 'La cantidad debe ser múltiplo de 2.5 kg para venta por bloques', path: ['cantidadVendidaKg'] }
);