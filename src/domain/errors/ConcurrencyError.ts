// Domain error: ConcurrencyError — thrown when optimistic locking detects a conflict
export class ConcurrencyError extends Error {
  constructor(message: string = 'Record was modified by another transaction') {
    super(message);
    this.name = 'ConcurrencyError';
  }
}