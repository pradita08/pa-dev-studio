/**
 * Pembatas percobaan login sederhana, dihitung di memori proses.
 *
 * Cukup untuk satu container: menahan penebakan password beruntun tanpa
 * menambah dependensi atau tabel. Kalau API diskalakan ke banyak replika,
 * hitungan ini perlu dipindah ke penyimpanan bersama.
 */
export class AttemptLimiter {
  constructor({ maxAttempts, windowSeconds }) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowSeconds * 1000;
    this.entries = new Map();
  }

  #prune(now) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }

  /** @returns {{blocked: boolean, retryAfterSeconds: number}} */
  check(key) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) return { blocked: false, retryAfterSeconds: 0 };
    if (entry.count < this.maxAttempts) return { blocked: false, retryAfterSeconds: 0 };
    return { blocked: true, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  fail(key) {
    const now = Date.now();
    if (this.entries.size > 5000) this.#prune(now);

    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    entry.count += 1;
  }

  succeed(key) {
    this.entries.delete(key);
  }
}
