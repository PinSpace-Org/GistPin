import { ShutdownService } from './shutdown.service';
import { InFlightRequestTracker } from './in-flight-tracker.service';
import type { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import { EventEmitter } from 'events';

class FakeTracker extends InFlightRequestTracker {
  public setActive(value: number): void {
    if (value > this.active) {
      for (let i = this.active; i < value; i += 1) this.start();
    } else if (value < this.active) {
      for (let i = this.active; i > value; i -= 1) this.end();
    }
  }
}

/**
 * Build a fake http.Server-shaped object whose `close(cb)` resolves once
 * `tracker.active === 0` (mimicking Node's behaviour when sockets drain).
 */
function makeHttpServer(tracker: FakeTracker): Server {
  const ee = new EventEmitter();
  const server = ee as unknown as Server;
  server.close = (cb?: (err?: Error) => void): void => {
    if (tracker.active === 0) {
      cb?.();
      return;
    }
    const interval = setInterval(() => {
      if (tracker.active === 0) {
        clearInterval(interval);
        cb?.();
      }
    }, 5);
  };
  return server;
}

describe('ShutdownService', () => {
  let tracker: FakeTracker;
  let config: ConfigService;
  let httpServer: Server & EventEmitter;
  let app: INestApplication;
  let service: ShutdownService;
  let originalExit: typeof process.exit;

  beforeEach(() => {
    tracker = new FakeTracker();
    httpServer = makeHttpServer(tracker) as Server & EventEmitter;

    config = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: number) => {
        if (key === 'SHUTDOWN_TIMEOUT_MS') return 200;
        return defaultValue;
      }),
    } as unknown as ConfigService;

    app = {
      getHttpServer: () => httpServer,
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;

    service = new ShutdownService(app, tracker, config);

    // Stub process.exit so the success path doesn't terminate the test runner.
    originalExit = process.exit;
    process.exit = jest.fn() as never;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('calls httpServer.close and app.close when a signal arrives', async () => {
    const closeSpy = jest.spyOn(httpServer, 'close');
    tracker.setActive(0);

    await service.handleSignal('SIGTERM');

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(app.close).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('waits for in-flight requests to drain before closing the app', async () => {
    tracker.setActive(2);

    // Drain in the background; verify app.close hasn't been called yet.
    setTimeout(() => tracker.setActive(0), 30);

    await service.handleSignal('SIGTERM');

    expect(app.close).toHaveBeenCalledTimes(1);
  });

  it('still closes the app when the timeout is exceeded', async () => {
    tracker.setActive(10); // never drained

    await service.handleSignal('SIGTERM');

    expect(app.close).toHaveBeenCalledTimes(1);
    // Failure path: do NOT exit cleanly, let the platform supervisor handle it.
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('is idempotent: a second signal is logged and ignored', async () => {
    tracker.setActive(0);

    await service.handleSignal('SIGTERM');
    await service.handleSignal('SIGINT');

    expect(app.close).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledTimes(1);
  });

  it('still calls app.close when there is no HTTP server attached', async () => {
    (app as unknown as { getHttpServer: () => unknown }).getHttpServer = (): never => {
      throw new Error('no http server');
    };

    await service.handleSignal('SIGTERM');

    expect(app.close).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('does not call process.exit when app.close throws', async () => {
    tracker.setActive(0);
    (app.close as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(service.handleSignal('SIGTERM')).resolves.toBeUndefined();
    expect(process.exit).not.toHaveBeenCalled();
  });
});
