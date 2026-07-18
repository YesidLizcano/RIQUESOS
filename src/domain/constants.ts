import { MetodoPago } from './enums';

// Domain Constants — business rules as explicit constants
// No external imports allowed (except enums for constant arrays).

/** Valid payment methods for abono on CREDITO ventas */
export const METODOS_PAGO_ABONO: readonly MetodoPago[] = [
  MetodoPago.EFECTIVO,
  MetodoPago.NEQUI,
  MetodoPago.BRE_B,
] as const;

// Block size for Doble Crema cheese (in kg)
// Doble Crema is sold to Mayoristas and purchased from suppliers in 2.5 kg blocks
export const DOBLE_CREMA_BLOCK_KG = 2.5;

/** Number of complete blocks in a given stock (in kg) */
export function bloquesCompletos(stockKg: number): number {
  return Math.floor(stockKg / DOBLE_CREMA_BLOCK_KG);
}

/** Remaining kg after removing complete blocks */
export function kgParciales(stockKg: number): number {
  return Math.round((stockKg % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;
}

/** Whether a product type is Doble Crema */
export function isDobleCrema(producto: string): boolean {
  return producto === 'DOBLE_CREMA';
}

/** ID of the permanent accumulation lot for Recortes Doble Crema */
export const RECORTES_DC_PERMANENT_LOT_ID = 'lote-recortes-dc-permanente';

/** Whether a product type is Recortes Doble Crema */
export function isRecortesDobleCrema(producto: string): boolean {
  return producto === 'RECORTES_DOBLE_CREMA';
}

/**
 * Format Doble Crema loose kg into block notation for a SINGLE variety.
 * Variety determines the suffix: 'entero' → "X enteros + Y kg (de entero)",
 * 'tajado' → "X tajados + Y kg (de tajado)".
 *
 * Business rule: loose kg from one variety CANNOT mix with the other.
 * Each variety converts its own kg to whole blocks independently.
 *
 * Examples (entero):
 *   10 kg → "4 enteros"
 *   6 kg  → "2 enteros + 1 kg (de entero)"
 *   1 kg  → "1 kg (de entero)"
 *
 * Examples (tajado):
 *   5 kg  → "2 tajados"
 *   3 kg  → "1 tajado + 0.5 kg (de tajado)"
 *   1 kg  → "1 kg (de tajado)"
 */
export function formatDobleCremaGranel(
  kg: number,
  variedad: 'entero' | 'tajado' = 'entero',
  origenTajado?: 'INTERNO' | 'FABRICA',
): string {
  if (kg <= 0) return '0';
  const enteros = Math.floor(kg / DOBLE_CREMA_BLOCK_KG);
  const restante = Math.round((kg % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;
  const tipoSuffix = variedad === 'tajado' && origenTajado ? ` ${origenTajado === 'FABRICA' ? 'TF' : 'TI'}` : '';

  if (enteros === 0) return `${restante} kg (de ${variedad}${tipoSuffix})`;
  const label = variedad === 'entero' ? 'enteros' : 'tajados';
  if (restante === 0) {
    return `${enteros} ${label}${tipoSuffix}`;
  }
  return `${enteros} ${label} + ${restante} kg (de ${variedad}${tipoSuffix})`;
}

/**
 * Format Doble Crema aggregated detail from 4 accumulators.
 *
 * Business rule: kilos sold granel from enteros and tajados CANNOT mix.
 * Each variety converts its own kg to whole blocks independently, then
 * the remainder kg keeps the variety suffix.
 *
 * @param enteros - Whole blocks sold from ENTERO variety
 * @param tajados - Whole blocks sold from TAJADO variety
 * @param kgSueltosEntero - Loose kg from ENTERO variety (granel sales)
 * @param kgSueltosTajado - Loose kg from TAJADO variety (granel sales)
 *
 * Example:
 *   formatDobleCremaDetalle(26, 5, 2, 1)
 *   → "26 enteros + 5 tajados + 2 kg (de entero) + 1 kg (de tajado)"
 */
export function formatDobleCremaDetalle(
  enteros: number,
  tajados: number,
  kgSueltosEntero: number,
  kgSueltosTajado: number,
): string {
  // Convert loose kg to whole blocks per variety
  const enterosExtra = Math.floor(kgSueltosEntero / DOBLE_CREMA_BLOCK_KG);
  const remanenteEntero = Math.round((kgSueltosEntero % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;

  const tajadosExtra = Math.floor(kgSueltosTajado / DOBLE_CREMA_BLOCK_KG);
  const remanenteTajado = Math.round((kgSueltosTajado % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;

  const totalEnteros = enteros + enterosExtra;
  const totalTajados = tajados + tajadosExtra;

  // Build output: only include non-zero segments
  const parts: string[] = [];

  if (totalEnteros > 0) {
    parts.push(`${totalEnteros} enteros`);
  }
  if (totalTajados > 0) {
    parts.push(`${totalTajados} tajados`);
  }
  if (remanenteEntero > 0) {
    parts.push(`${remanenteEntero} kg (de entero)`);
  }
  if (remanenteTajado > 0) {
    parts.push(`${remanenteTajado} kg (de tajado)`);
  }

  return parts.length > 0 ? parts.join(' + ') : '0';
}