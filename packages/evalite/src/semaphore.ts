/**
 * A simple semaphore implementation for controlling concurrent execution.
 * Used to limit the number of variants that can run simultaneously.
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    if (permits <= 0) {
      throw new Error("Semaphore permits must be positive");
    }
    this.permits = permits;
  }

  /**
   * Acquire a permit. If no permits are available, the promise will resolve
   * when a permit becomes available.
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.permits--;
        resolve();
      });
    });
  }

  /**
   * Release a permit, allowing the next waiting task to proceed.
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }

  /**
   * Get the number of available permits (for testing).
   */
  available(): number {
    return this.permits;
  }

  /**
   * Get the number of tasks waiting for permits (for testing).
   */
  queueLength(): number {
    return this.queue.length;
  }
}
