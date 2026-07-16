// Domain formatters — shared formatting utilities

/**
 * Format a number as Argentine Peso currency string.
 * Rounds to whole pesos, uses Argentine locale grouping.
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return `$${Math.round(num).toLocaleString('es-AR')}`;
}

/**
 * Format Semisalado kg display with one decimal.
 */
export function formatSSKg(kg: number): string {
  return `${Math.round(kg * 10) / 10} kg`;
}

/**
 * Convert SNAKE_CASE or UPPER CASE enum value to Title Case.
 * Replaces underscores with spaces and capitalizes the first letter of each word.
 *
 * Examples:
 *   formatProductName('DOBLE_CREMA') → 'Doble Crema'
 *   formatProductName('SEMISALADO')  → 'Semisalado'
 *   formatProductName('DOBLE CREMA')  → 'Doble Crema'
 */
export function formatProductName(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}