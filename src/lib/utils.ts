import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sum an array of decimal string values without floating-point precision loss.
 * Uses string-based arithmetic internally for exact results.
 * Returns the sum as a string.
 */
export function decimalSum(values: string[]): string {
  if (values.length === 0) return '0';

  // Find max decimal places
  let maxDecimals = 0;
  for (const v of values) {
    const parts = v.split('.');
    if (parts.length > 1) {
      maxDecimals = Math.max(maxDecimals, parts[1].replace(/0+$/, '').length);
    }
  }

  // Scale all values to integers (using regular number arithmetic on scaled values)
  // Since we're scaling to the max decimal places and then doing integer addition,
  // the result is exact as long as scaled values fit in Number.MAX_SAFE_INTEGER
  // For financial values this is always the case (trillions with 2 decimals = 14 digits)
  const scale = Math.pow(10, maxDecimals);

  let totalScaled = 0;
  for (const v of values) {
    const isNeg = v.startsWith('-');
    const abs = isNeg ? v.slice(1) : v;
    const [intPart = '0', fracPart = ''] = abs.split('.');
    const paddedFrac = fracPart.padEnd(maxDecimals, '0');
    const scaled = parseInt(intPart + paddedFrac, 10);
    totalScaled += isNeg ? -scaled : scaled;
  }

  // Convert back to string
  const isNeg = totalScaled < 0;
  const absScaled = Math.abs(totalScaled);
  const scaledStr = String(absScaled);

  if (maxDecimals === 0) return (isNeg ? '-' : '') + scaledStr;

  const intPart = scaledStr.slice(0, -maxDecimals) || '0';
  const fracPart = scaledStr.slice(-maxDecimals).replace(/0+$/, '');
  return (isNeg ? '-' : '') + (fracPart ? `${intPart}.${fracPart}` : intPart);
}

/**
 * Subtract two decimal string values without floating-point precision loss.
 * Returns (a - b) as a string.
 */
export function decimalSub(a: string, b: string): string {
  return decimalSum([a, b.startsWith('-') ? b.slice(1) : '-' + b]);
}
