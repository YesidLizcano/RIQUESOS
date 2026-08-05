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

/** Whether a lot is the permanent recortes accumulation lot */
export function isRecortesLot(loteId: string): boolean {
  return loteId === RECORTES_DC_PERMANENT_LOT_ID;
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
 * Format Doble Crema aggregated detail from block counts.
 *
 * Shows Enteros, TI, and TF separately with suffix labels.
 * Loose kg from each variety are converted to whole blocks + remainder.
 *
 * @param enteros - Whole blocks from ENTERO variety
 * @param tajadosInternos - Whole blocks from TAJADO INTERNO variety
 * @param tajadosFabrica - Whole blocks from TAJADO DE FÁBRICA variety
 * @param kgSueltosEntero - Loose kg from ENTERO variety
 * @param kgSueltosTajado - Loose kg from TAJADO variety (TI gets priority for sueltos)
 *
 * Example:
 *   formatDobleCremaDetalle(26, 3, 2, 1.5, 0.5)
 *   → "26 E + 3 TI + 2 TF + 1.5 kg (de entero) + 0.5 kg (de tajado)"
 */
export function formatDobleCremaDetalle(
  enteros: number,
  tajadosInternos: number,
  tajadosFabrica: number,
  kgSueltosEntero: number,
  kgSueltosTajado: number,
): string {
  // Convert loose kg to whole blocks per variety
  const enterosExtra = Math.floor(kgSueltosEntero / DOBLE_CREMA_BLOCK_KG);
  const remanenteEntero = Math.round((kgSueltosEntero % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;

  const tajadosExtra = Math.floor(kgSueltosTajado / DOBLE_CREMA_BLOCK_KG);
  const remanenteTajado = Math.round((kgSueltosTajado % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;

  const totalEnteros = enteros + enterosExtra;
  // Sueltos tajados go to TI (internally cut)
  const totalTI = tajadosInternos + tajadosExtra;
  const totalTF = tajadosFabrica;

  // Build output: only include non-zero segments
  const parts: string[] = [];

  if (totalEnteros > 0) {
    parts.push(`${totalEnteros} E`);
  }
  if (totalTI > 0) {
    parts.push(`${totalTI} TI`);
  }
  if (totalTF > 0) {
    parts.push(`${totalTF} TF`);
  }
  if (remanenteEntero > 0) {
    parts.push(`${remanenteEntero} kg (de entero)`);
  }
  if (remanenteTajado > 0) {
    parts.push(`${remanenteTajado} kg (de tajado)`);
  }

  return parts.length > 0 ? parts.join(' + ') : '0';
}

/**
 * Format a DC lote's block composition as a compact label.
 * Used in lote table columns and venta lote selectors.
 *
 * Rules:
 * - Original E/TF blocks shown with suffix
 * - Recortes/internal lots (no original blocks, proveedorId null): all stock is TI
 * - Remainder kg shown if not an exact multiple of 2.5
 *
 * Examples:
 *   formatDobleCremaStockLabel(36, 0, 4, 0, 0) → "36E + 4TF"
 *   formatDobleCremaStockLabel(0, 0, 2, 0, 0) → "2TF"
 *   formatDobleCremaStockLabel(0, 0, 0, 0, 0, 3) → "1TI + 0.5kg"  (recortes)
 *   formatDobleCremaStockLabel(10, 3, 2, 1.5, 0.8) → "10E + 3TI + 2TF + 1.5kg(E) + 0.8kg(T)"
 */
export function formatDobleCremaStockLabel(
  bloquesEnteros: number,
  bloquesTajados: number,
  bloquesTajadosDeFabrica: number,
  sueltosEntero: number,
  sueltosTajado: number,
  stockDisponibleKg?: number,
): string {
  const parts: string[] = [];

  if (bloquesEnteros > 0) parts.push(`${bloquesEnteros}E`);
  if (bloquesTajadosDeFabrica > 0) parts.push(`${bloquesTajadosDeFabrica}TF`);
  if (bloquesTajados > 0) parts.push(`${bloquesTajados}TI`);

  // Convert loose kg to blocks + remainder per variety
  const enterosExtra = Math.floor(sueltosEntero / DOBLE_CREMA_BLOCK_KG);
  const remanenteEntero = Math.round((sueltosEntero % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;
  const tajadosExtra = Math.floor(sueltosTajado / DOBLE_CREMA_BLOCK_KG);
  const remanenteTajado = Math.round((sueltosTajado % DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;

  if (enterosExtra > 0) parts.push(`${enterosExtra}E`);
  if (tajadosExtra > 0) parts.push(`${tajadosExtra}TI`);
  if (remanenteEntero > 0) parts.push(`${remanenteEntero}kg(E)`);
  if (remanenteTajado > 0) parts.push(`${remanenteTajado}kg(T)`);

  // Recortes/internal lots: no blocks at all but has stock → treat as TI
  if (parts.length === 0 && stockDisponibleKg && stockDisponibleKg > 0) {
    const blocks = Math.floor(stockDisponibleKg / DOBLE_CREMA_BLOCK_KG);
    const remainder = Math.round((stockDisponibleKg - blocks * DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;
    if (blocks > 0) parts.push(`${blocks}TI`);
    if (remainder > 0) parts.push(`${remainder}kg`);
  }

  return parts.length > 0 ? parts.join(' + ') : '0';
}

/**
 * Format a DC lote's purchased composition as a compact label.
 * Uses original block counts (not current, which change with tajados).
 * Same logic as formatDobleCremaStockLabel but for the "Cant. Comprada" column.
 *
 * Recortes/internal lots: all kg are TI sueltos.
 */
export function formatDobleCremaPurchasedLabel(
  bloquesEnterosOriginal: number,
  bloquesTajadosFabricaOriginal: number,
  cantidadCompradaKg: number,
): string {
  const parts: string[] = [];
  if (bloquesEnterosOriginal > 0) parts.push(`${bloquesEnterosOriginal}E`);
  if (bloquesTajadosFabricaOriginal > 0) parts.push(`${bloquesTajadosFabricaOriginal}TF`);

  // Recortes/internal lots: no original blocks, all kg are TI
  if (parts.length === 0 && cantidadCompradaKg > 0) {
    const blocks = Math.floor(cantidadCompradaKg / DOBLE_CREMA_BLOCK_KG);
    const remainder = Math.round((cantidadCompradaKg - blocks * DOBLE_CREMA_BLOCK_KG) * 1000) / 1000;
    if (blocks > 0) parts.push(`${blocks}TI`);
    if (remainder > 0) parts.push(`${remainder}kg`);
  }

  return parts.length > 0 ? parts.join('+') : '0';
}