import { Injectable, Logger } from '@nestjs/common';

/**
 * Tracks the number of in-flight HTTP requests in the process so that the
 * shutdown sequence can wait for them to drain before closing connections.
 *
 * The tracker is a process-wide singleton: middleware increments on entry,
 * and decrements when the underlying HTTP response finishes or the
 * connection closes prematurely.
 */
@Injectable()
export class InFlightRequestTracker {
  private readonly logger = new Logger(InFlightRequestTracker.name);
  private count = 0;

  /** Begin tracking one request. */
  start(): void {
    this.count += 1;
  }

  /**
   * End tracking one request. Uses a floor of zero so that a stray `end`
   * (e.g. on a response that finished before its middleware mounted in
   * test harnesses) cannot drive the counter negative.
   */
  end(): void {
    this.count = Math.max(0, this.count - 1);
  }

  /** Current number of in-flight requests. */
  get active(): number {
    return this.count;
  }

  /** Reset to zero — used in tests only. */
  reset(): void {
    this.count = 0;
  }

  /** Log the current count at debug level — used by shutdown polling. */
  logActive(context = 'inflight'): void {
    this.logger.debug(`[${context}] active=${this.count}`);
  }
}
