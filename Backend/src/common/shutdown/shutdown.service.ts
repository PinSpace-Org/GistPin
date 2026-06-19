import { Logger, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'http';
import { InFlightRequestTracker } from './in-flight-tracker.service';

/**
 * Orchestrates graceful shutdown for the GistPin API.
 *
 * On SIGTERM / SIGINT the service:
 *  1. Marks the process as shutting down so repeat signals are no-ops.
 *  2. Stops the HTTP server from accepting new connections.
 *  3. Polls the in-flight request tracker until it reaches zero OR
 *     `SHUTDOWN_TIMEOUT_MS` elapses (whichever happens first).
 *  4. Closes the Nest application, which triggers
 *     `beforeApplicationShutdown` and `onModuleDestroy` hooks so that
 *     the TypeORM DataSource, metrics exporters, the indexer poll loop,
 *     and other long-lived resources wind down cleanly.
 *  5. Calls `process.exit(0)` on the success path so the event loop is
 *     guaranteed to terminate even if a stray timer leaked.
 *
 * This class is *not* a Nest provider: `INestApplication` cannot be
 * resolved through DI before the application context exists. Instead it
 * is instantiated manually in `main.ts` after `NestFactory.create()` and
 * passed concrete references to the app, the in-flight tracker, and the
 * config service.
 */
export class ShutdownService {
  private readonly logger = new Logger(ShutdownService.name);
  private shuttingDown = false;
  private readonly pollIntervalMs = 250;

  constructor(
    private readonly app: INestApplication,
    private readonly tracker: InFlightRequestTracker,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle a termination signal. Safe to call multiple times: subsequent
   * calls are logged and ignored so that a second SIGTERM (e.g. from
   * Kubernetes after the grace period) does not corrupt state.
   */
  async handleSignal(signal: NodeJS.Signals): Promise<void> {
    if (this.shuttingDown) {
      this.logger.warn(`Already shutting down — ignoring ${signal}`);
      return;
    }
    this.shuttingDown = true;

    const timeoutMs = this.configService.get<number>('SHUTDOWN_TIMEOUT_MS', 25_000);
    const start = Date.now();

    this.logger.log(
      `Received ${signal} — beginning graceful shutdown (timeout=${timeoutMs}ms)`,
    );

    let cleanShutdown = true;

    try {
      await this.drainHttpServer(timeoutMs, start);
    } catch (err) {
      cleanShutdown = false;
      this.logger.error(
        `Drain step failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    try {
      await this.closeApp(start);
    } catch (err) {
      cleanShutdown = false;
      this.logger.error(
        `App close failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    this.logger.log(`Shutdown complete in ${Date.now() - start}ms`);

    // Only force exit on the success path — if shutdown errored, leave
    // the platform's supervisor (K8s, systemd) to terminte us so we get
    // crash visibility rather than masking the underlying error.
    if (cleanShutdown) {
      process.exit(0);
    }
  }

  /** Test-only hook: reset internal guard so the service can be re-used. */
  resetForTesting(): void {
    this.shuttingDown = false;
  }

  private async drainHttpServer(timeoutMs: number, start: number): Promise<void> {
    const httpServer = this.tryGetHttpServer();
    if (!httpServer) {
      this.logger.debug('No HTTP server attached — skipping drain step');
      return;
    }

    // `server.close()` resolves once every open socket has ended. We
    // promisify the callback form so we can race it against a bounded
    // tracker-poll loop. The tracker is the source of truth for "are we
    // still serving requests?" because Node may not report server.close
    // immediately when keep-alive sockets are involved.
    const closePromise = new Promise<void>((resolve) => {
      httpServer.close((err) => {
        if (err && err.message !== 'Server is not running.') {
          this.logger.error(`HTTP server close error: ${err.message}`);
        }
        resolve();
      });
    });

    while (this.tracker.active > 0 && Date.now() - start < timeoutMs) {
      const elapsed = Date.now() - start;
      this.logger.log(
        `Waiting for ${this.tracker.active} in-flight request(s)... (elapsed ${elapsed}ms)`,
      );
      await this.sleep(this.pollIntervalMs);
    }

    if (this.tracker.active > 0) {
      this.logger.warn(
        `Shutdown timeout reached — ${this.tracker.active} request(s) still in-flight after ${timeoutMs}ms`,
      );
    } else {
      this.logger.log(`All in-flight requests drained (elapsed ${Date.now() - start}ms)`);
    }

    // Best-effort: cap the wait for server.close() at the remaining
    // time-budget so we never exceed the configured timeout.
    const remainingMs = Math.max(0, timeoutMs - (Date.now() - start));
    await Promise.race([closePromise, this.sleep(remainingMs)]);
  }

  private async closeApp(start: number): Promise<void> {
    await this.app.close();
    this.logger.log(`Nest app closed (elapsed ${Date.now() - start}ms)`);
  }

  private tryGetHttpServer(): Server | null {
    try {
      const maybeServer = this.app.getHttpServer();
      if (maybeServer && typeof (maybeServer as Server).close === 'function') {
        return maybeServer as Server;
      }
    } catch {
      return null;
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
