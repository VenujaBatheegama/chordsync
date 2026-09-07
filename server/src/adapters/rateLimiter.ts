/**
 * Simple token-bucket rate limiter.
 * Allows at most `maxRequests` per `windowMs` per key.
 */
export class RateLimiter {
  private tokens: Map<string, { count: number; resetAt: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 1, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed for the given key.
   * Blocks by waiting if limit is exceeded.
   */
  async throttle(key: string): Promise<void> {
    const now = Date.now();
    const entry = this.tokens.get(key);

    if (!entry || now >= entry.resetAt) {
      this.tokens.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      return;
    }

    // Wait until window resets
    const waitMs = entry.resetAt - now;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.tokens.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
  }
}

export const globalRateLimiter = new RateLimiter(1, 1200);
