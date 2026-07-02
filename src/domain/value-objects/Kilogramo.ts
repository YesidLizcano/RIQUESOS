// Value Object: Kilogramo — positive-number wrapper for weights
// No external imports allowed.

/**
 * Immutable value object representing a weight in kilograms.
 * Must be positive (>= 0). Returns new instances on operations.
 */
export class Kilogramo {
  private readonly _value: string;

  constructor(value: string | number) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid kilogram value: ${value}`);
    }
    if (num < 0) {
      throw new Error(`Kilogram value cannot be negative: ${value}`);
    }
    this._value = String(value);
  }

  get value(): string {
    return this._value;
  }

  subtract(other: Kilogramo): Kilogramo {
    const result = Number(this._value) - Number(other._value);
    if (result < 0) {
      throw new Error(`Subtraction would result in negative kilograms: ${this._value} - ${other._value}`);
    }
    return new Kilogramo(result);
  }

  add(other: Kilogramo): Kilogramo {
    return new Kilogramo(Number(this._value) + Number(other._value));
  }

  isZero(): boolean {
    return Number(this._value) === 0;
  }

  equals(other: Kilogramo): boolean {
    return Number(this._value) === Number(other._value);
  }

  greaterThan(other: Kilogramo): boolean {
    return Number(this._value) > Number(other._value);
  }

  lessThan(other: Kilogramo): boolean {
    return Number(this._value) < Number(other._value);
  }

  toString(): string {
    return this._value;
  }
}