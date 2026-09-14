export interface BoundedRetryOptions {
  attempts: number;
  delayMs: number;
  onFailure?: (error: unknown, attempt: number) => void;
}

export async function withBoundedRetry<T>(operation: (attempt: number) => Promise<T>, options: BoundedRetryOptions): Promise<T> {
  if (!Number.isSafeInteger(options.attempts) || options.attempts < 1) throw new RangeError('Retry attempts must be a positive integer.');
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new RangeError('Retry delay must be a non-negative number.');
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) {
      lastError = error; options.onFailure?.(error, attempt);
      if (attempt < options.attempts && options.delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, options.delayMs * attempt));
      }
    }
  }
  throw lastError;
}
