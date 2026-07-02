// Utility: handle Prisma errors in Server Actions
// Maps Prisma error codes to user-friendly Spanish messages

import { Prisma } from '@prisma/client';

/**
 * Handle Prisma errors and return a user-friendly Spanish error message.
 * Returns null if the error is not a recognized Prisma error.
 */
export function handlePrismaError(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
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