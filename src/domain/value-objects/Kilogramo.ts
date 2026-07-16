// Value Object: Kilogramo — positive-number wrapper for weights
// No external imports allowed. Uses string-based arithmetic for exact precision.

/**
 * Immutable value object representing a weight in kilograms.
 * Must be positive (>= 0). Returns new instances on operations.
 * Internally stored as a string to preserve exact decimal precision.
 * Uses BigInt-based arithmetic to avoid IEEE 754 float64 precision loss.
 */
export class Kilogramo {
  private readonly _value: string;

  constructor(value: string | number) {
    const str = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(str)) {
      throw new Error(`Invalid kilogram value: ${value}`);
    }
    if (str.startsWith('-')) {
      throw new Error(`Kilogram value cannot be negative: ${value}`);
    }
    // Normalize: remove trailing zeros after decimal point
    this._value = Kilogramo.normalize(str);
  }

  /** Factory method for zero kilograms */
  static zero(): Kilogramo {
    return new Kilogramo('0');
  }

  get value(): string {
    return this._value;
  }

  subtract(other: Kilogramo): Kilogramo {
    const result = Kilogramo.subtractStrings(this._value, other._value);
    if (result.startsWith('-')) {
      throw new Error(`Subtraction would result in negative kilograms: ${this._value} - ${other._value}`);
    }
    return new Kilogramo(result);
  }

  add(other: Kilogramo): Kilogramo {
    return new Kilogramo(Kilogramo.addStrings(this._value, other._value));
  }

  isZero(): boolean {
    return this._value === '0' || this._value === '0.0' || this._value === '0.00';
  }

  equals(other: Kilogramo): boolean {
    const diff = Kilogramo.subtractStrings(this._value, other._value);
    return diff === '0' || diff === '0.0' || diff === '0.00';
  }

  greaterThan(other: Kilogramo): boolean {
    const diff = Kilogramo.subtractStrings(this._value, other._value);
    return !diff.startsWith('-') && diff !== '0' && diff !== '0.0' && diff !== '0.00';
  }

  lessThan(other: Kilogramo): boolean {
    return other.greaterThan(this);
  }

  toString(): string {
    return this._value;
  }

  // --- Private string-based arithmetic (same approach as Dinero) ---

  private static normalize(s: string): string {
    if (!s.includes('.')) return s;
    const trimmed = s.replace(/0+$/, '');
    return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  }

  private static addStrings(a: string, b: string): string {
    const { whole: wA, frac: fA } = Kilogramo.splitDecimal(a);
    const { whole: wB, frac: fB } = Kilogramo.splitDecimal(b);
    const maxFrac = Math.max(fA.length, fB.length);
    const scaledA = BigInt(wA + fA.padEnd(maxFrac, '0'));
    const scaledB = BigInt(wB + fB.padEnd(maxFrac, '0'));
    const result = scaledA + scaledB;
    return Kilogramo.fromScaled(result, maxFrac);
  }

  private static subtractStrings(a: string, b: string): string {
    const { whole: wA, frac: fA } = Kilogramo.splitDecimal(a);
    const { whole: wB, frac: fB } = Kilogramo.splitDecimal(b);
    const maxFrac = Math.max(fA.length, fB.length);
    const scaledA = BigInt(wA + fA.padEnd(maxFrac, '0'));
    const scaledB = BigInt(wB + fB.padEnd(maxFrac, '0'));
    const result = scaledA - scaledB;
    return Kilogramo.fromScaled(result, maxFrac);
  }

  private static splitDecimal(s: string): { whole: string; frac: string } {
    const negative = s.startsWith('-');
    const abs = negative ? s.slice(1) : s;
    const [whole = '0', frac = ''] = abs.split('.');
    return {
      whole: (negative ? '-' : '') + (whole === '' ? '0' : whole),
      frac: frac || '0',
    };
  }

  private static fromScaled(scaled: bigint, fracDigits: number): string {
    const str = scaled.toString();
    const isNeg = str.startsWith('-');
    const abs = isNeg ? str.slice(1) : str;

    if (fracDigits === 0) return str;

    const padded = abs.padStart(fracDigits + 1, '0');
    const intPart = padded.slice(0, -fracDigits) || '0';
    const fracPart = padded.slice(-fracDigits).replace(/0+$/, '');

    const result = fracPart ? `${intPart}.${fracPart}` : intPart;
    return isNeg ? `-${result}` : result;
  }
}