// Utility: handle Prisma errors in Server Actions
// Maps Prisma error codes to user-friendly Spanish messages

import { Prisma } from '@prisma/client';
import type { LoteResponse } from '../dtos';

/**
 * Handle Prisma errors and return a user-friendly Spanish error message.
 * Returns null if the error is not a recognized Prisma error.
 */
export function handlePrismaError(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint failed — extract target field from meta
        const target = (error.meta?.target as string[])?.join(', ') ?? 'campo';
        return `Ya existe un registro con el mismo ${target}`;
      }
      case 'P2003':
        // Foreign key constraint failed — record has related records
        return 'No se puede eliminar un registro que tiene elementos asociados';
      case 'P2025':
        // Record not found
        return 'El registro no existe';
      default:
        return `Error de base de datos (${error.code})`;
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return 'No se puede eliminar un registro que tiene elementos asociados';
  }

  return null;
}

/**
 * Specific FK error messages by entity.
 * Use these in Server Actions for more precise error messages.
 */
export const fkErrorMessages: Record<string, string> = {
  proveedor_con_lotes: 'No se puede eliminar un proveedor con lotes asociados',
  cliente_con_ventas: 'No se puede eliminar un cliente con ventas asociadas',
  lote_con_ventas: 'No se puede eliminar un lote con ventas asociadas',
  gasto_sin_restriccion: 'No se puede eliminar el gasto fijo',
};

/**
 * Convert a Lote entity to a LoteResponse DTO.
 * Shared between lotes.ts and proveedores.ts server actions.
 */
export function loteToResponse(lote: import('@/domain/entities/Lote').Lote): LoteResponse {
  return {
    id: lote.id,
    producto: lote.producto,
    fechaIngreso: lote.fechaIngreso.toISOString(),
    proveedorId: lote.proveedorId,
    cantidadCompradaKg: lote.cantidadCompradaKg.value,
    precioCompraBaseKg: lote.precioCompraBaseKg.value,
    precioPorBloqueEntero: lote.precioPorBloqueEntero.value,
    precioPorBloqueTajado: lote.precioPorBloqueTajado.value,
    costoFlete: lote.costoFlete.value,
    costoTajado: lote.costoTajado.value,
    costoEmpaques: lote.costoEmpaques.value,
    costoSeparadores: lote.costoSeparadores.value,
    costoRealCalculadoKg: lote.costoRealCalculadoKg.value,
    costoTajadoKg: lote.costoTajadoKg.value,
    costoTajadoFabricaKg: lote.costoTajadoFabricaKg.value,
    stockDisponibleKg: lote.stockDisponibleKg.value,
    bloquesEnteros: lote.bloquesEnteros,
    bloquesTajados: lote.bloquesTajados,
    bloquesTajadosDeFabrica: lote.bloquesTajadosDeFabrica,
    bloquesEnterosOriginal: lote.bloquesEnterosOriginal,
    bloquesTajadosFabricaOriginal: lote.bloquesTajadosFabricaOriginal,
    sueltosEntero: lote.sueltosEntero.value,
    sueltosTajado: lote.sueltosTajado.value,
    bloquesTajadosDisponibles: lote.bloquesTajados + lote.bloquesTajadosDeFabrica,
    estado: lote.estado,
    estadoPago: lote.estadoPago,
    metodoPagoLote: lote.metodoPagoLote,
    version: lote.version,
    deletedAt: lote.deletedAt?.toISOString() ?? null,
  };
}