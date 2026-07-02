// Value Object: Dinero — Decimal wrapper for monetary values
// No external imports. Uses string-based arithmetic to stay pure.

/**
 * Immutable value object representing a monetary amount.
 * All arithmetic operations return new instances.
 * Internally stored as a string to preserve exact decimal precision.
 */
export class Dinero {
  private readonly _value: string;

  constructor(value: string | number) {
    const parsed = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(parsed)) {
      throw new Error(`Invalid monetary value: ${value}`);
    }
    this._value = parsed;
  }

  get value(): string {
    return this._value;
  }

  add(other: Dinero): Dinero {
    return new Dinero(this.addStrings(this._value, other._value));
  }

  subtract(other: Dinero): Dinero {
    return new Dinero(this.subtractStrings(this._value, other._value));
  }

  multiply(factor: string | number): Dinero {
    const result = this.multiplyStrings(this._value, String(factor));
    return new Dinero(result);
  }

  divide(divisor: string | number): Dinero {
    const divisorStr = String(divisor);
    if (divisorStr === '0' || divisor === 0) {
      throw new Error('Division by zero');
    }
    const result = this.divideStrings(this._value, divisorStr);
    return new Dinero(result);
  }

  isNegative(): boolean {
    return this._value.startsWith('-');
  }

  isZero(): boolean {
    return this._value === '0' || this._value === '0.0' || this._value === '0.00';
  }

  equals(other: Dinero): boolean {
    return this._value === other._value;
  }

  greaterThan(other: Dinero): boolean {
    return this.compare(this._value, other._value) > 0;
  }

  lessThan(other: Dinero): boolean {
    return this.compare(this._value, other._value) < 0;
  }

  toString(): string {
    return this._value;
  }

  /** Factory for zero */
  static zero(): Dinero {
    return new Dinero('0');
  }

  // --- Private string-based arithmetic helpers ---

  private addStrings(a: string, b: string): string {
    const { whole: wA, frac: fA } = this.splitDecimal(a);
    const { whole: wB, frac: fB } = this.splitDecimal(b);
    const maxFrac = Math.max(fA.length, fB.length);
    const scaledA = BigInt(wA + fA.padEnd(maxFrac, '0'));
    const scaledB = BigInt(wB + fB.padEnd(maxFrac, '0'));
    const result = scaledA + scaledB;
    return this.fromScaled(result, maxFrac);
  }

  private subtractStrings(a: string, b: string): string {
    const { whole: wA, frac: fA } = this.splitDecimal(a);
    const { whole: wB, frac: fB } = this.splitDecimal(b);
    const maxFrac = Math.max(fA.length, fB.length);
    const scaledA = BigInt(wA + fA.padEnd(maxFrac, '0'));
    const scaledB = BigInt(wB + fB.padEnd(maxFrac, '0'));
    const result = scaledA - scaledB;
    return this.fromScaled(result, maxFrac);
  }

  private multiplyStrings(a: string, b: string): string {
    const { whole: wA, frac: fA } = this.splitDecimal(a);
    const { whole: wB, frac: fB } = this.splitDecimal(b);
    const totalFrac = fA.length + fB.length;
    const scaledA = BigInt(wA + fA);
    const scaledB = BigInt(wB + fB);
    const result = scaledA * scaledB;
    return this.fromScaled(result, totalFrac);
  }

  private divideStrings(a: string, b: string): string {
    // Scale up dividend to preserve precision (10 extra decimal places)
    const { whole: wA, frac: fA } = this.splitDecimal(a);
    const { whole: wB, frac: fB } = this.splitDecimal(b);
    const precision = 10;
    const totalFrac = fA.length - fB.length + precision;
    const scaledA = BigInt(wA + fA + '0'.repeat(precision));
    const scaledB = BigInt(wB + fB);
    const result = scaledA / scaledB;
    return this.fromScaled(result, totalFrac);
  }

  private splitDecimal(s: string): { whole: string; frac: string } {
    const negative = s.startsWith('-');
    const abs = negative ? s.slice(1) : s;
    const [whole = '0', frac = ''] = abs.split('.');
    return {
      whole: (negative ? '-' : '') + (whole === '' ? '0' : whole),
      frac: frac || '0',
    };
  }

  private fromScaled(scaled: bigint, fracDigits: number): string {
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

  private compare(a: string, b: string): number {
    const diff = this.subtractStrings(a, b);
    if (diff === '0' || diff === '0.0' || diff === '0.00') return 0;
    return diff.startsWith('-') ? -1 : 1;
  }
}