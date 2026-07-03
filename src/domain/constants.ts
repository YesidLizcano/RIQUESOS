// Domain Constants — business rules as explicit constants
// No external imports allowed.

// Block size for Doble Crema cheese (in kg)
// Doble Crema is sold to Mayoristas and purchased from suppliers in 2.5 kg blocks
export const DOBLE_CREMA_BLOCK_KG = 2.5;

/** Number of complete blocks in a given stock (in kg) */
export function bloquesCompletos(stockKg: number): number {
  return Math.floor(stockKg / DOBLE_CREMA_BLOCK_KG);
}

/** Remaining kg after removing complete blocks */
export function kgParciales(stockKg: number): number {
  return Number((stockKg % DOBLE_CREMA_BLOCK_KG).toFixed(1));
}

/** Whether a product type is Doble Crema */
export function isDobleCrema(producto: string): boolean {
  return producto === 'DOBLE_CREMA';
}