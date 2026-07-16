// Zod validation schema for Venta registration — server-side only
import { z } from 'zod';
import { DOBLE_CREMA_BLOCK_KG } from '@/domain/constants';

export const ventaItemSchema = z.object({
  loteId: z.string().min(1, 'Seleccione un lote'),
  ventaTipo: z.enum(['BLOQUES', 'GRANEL']),
  cantidadKg: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  precioVentaKg: z.coerce.number().positive('El precio debe ser mayor a 0'),
  bloquesEnterosVendidos: z.coerce.number().int().nonnegative().optional().default(0),
  bloquesTajadosVendidos: z.coerce.number().int().nonnegative().optional().default(0),
  bloquesReempacados: z.coerce.number().int().nonnegative().optional().default(0),
  origenCorte: z.enum(['ENTERO', 'TAJADO']).optional().default('ENTERO'),
}).refine(
  // Block constraint: BLOQUES mode requires integer block count (multiple of 2.5 kg)
  (data) => {
    if (data.ventaTipo === 'BLOQUES') {
      const remainder = Number((data.cantidadKg / DOBLE_CREMA_BLOCK_KG).toFixed(6)) % 1;
      return Math.abs(remainder) < 0.001;
    }
    return true;
  },
  { message: 'La cantidad debe ser múltiplo de 2.5 kg para venta por bloques', path: ['cantidadKg'] }
).refine(
  // Reempacado constraint: can't reempacar more blocks than sold
  (data) => {
    if (data.ventaTipo === 'BLOQUES' && data.bloquesReempacados > 0) {
      const maxBloques = data.bloquesEnterosVendidos + data.bloquesTajadosVendidos;
      return data.bloquesReempacados <= maxBloques;
    }
    return true;
  },
  { message: 'No se pueden reempacar más bloques de los vendidos', path: ['bloquesReempacados'] }
);

export const registrarVentaSchema = z.object({
  clienteId: z.string().min(1, 'Seleccione un cliente'),
  items: z.array(ventaItemSchema).min(1, 'Al menos un item es requerido'),
  valorDomicilio: z.coerce.number().nonnegative('El valor del domicilio no puede ser negativo').optional().default(0),
  costoDomiciliario: z.coerce.number().nonnegative('El costo del domiciliario no puede ser negativo').optional().default(0),
  domiciliario: z.string().trim().max(100, 'El nombre del domiciliario no puede superar 100 caracteres').optional(),
  metodoPago: z.enum(['EFECTIVO', 'NEQUI', 'BRE_B', 'CREDITO']).optional(),
  metodoPagoAbono: z.enum(['EFECTIVO', 'NEQUI', 'BRE_B']).optional(),
  abono: z.string().optional(),
  observaciones: z.string().trim().max(500, 'Las observaciones no pueden superar 500 caracteres').optional(),
});