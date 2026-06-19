import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InFlightRequestTracker } from './in-flight-tracker.service';

/**
 * Express middleware that increments the shared in-flight counter on entry
 * and decrements it when the response finishes or the underlying connection
 * closes prematurely. The counter is consumed by `ShutdownService` so that
 * the process does not tear down DB connections or HTTP sockets while
 * requests are still being served.
 *
 * Registered globally (see `AppModule.configure`) so it covers every route
 * including `/health` and any unmatched paths.
 */
@Injectable()
export class InFlightRequestMiddleware implements NestMiddleware {
  constructor(private readonly tracker: InFlightRequestTracker) {}

  use(_req: Request, res: Response, next: NextFunction): void {
    this.tracker.start();

    const release = () => {
      res.off('finish', release);
      res.off('close', release);
      this.tracker.end();
    };

    res.on('finish', release);
    res.on('close', release);

    next();
  }
}
