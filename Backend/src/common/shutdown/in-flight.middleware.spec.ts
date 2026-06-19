import { EventEmitter } from 'events';
import { InFlightRequestMiddleware } from './in-flight.middleware';
import { InFlightRequestTracker } from './in-flight-tracker.service';

/**
 * Minimal Express-compatible Request/Response stand-ins that satisfy the
 * surface area touched by the middleware. Response is an EventEmitter
 * that we mutate to simulate `finish` and `close` events.
 */
function makeReqRes(): {
  req: Record<string, unknown>;
  res: EventEmitter & { off: EventEmitter['off'] };
  next: jest.Mock;
} {
  return {
    req: { method: 'GET', url: '/' },
    res: new EventEmitter(),
    next: jest.fn(),
  };
}

describe('InFlightRequestMiddleware', () => {
  let tracker: InFlightRequestTracker;
  let middleware: InFlightRequestMiddleware;

  beforeEach(() => {
    tracker = new InFlightRequestTracker();
    middleware = new InFlightRequestMiddleware(tracker);
  });

  it('increments the tracker on entry and calls next()', () => {
    const { res, next } = makeReqRes();
    middleware.use({} as never, res as never, next);
    expect(tracker.active).toBe(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('decrements the tracker exactly once when res emits `finish`', () => {
    const { res, next } = makeReqRes();
    middleware.use({} as never, res as never, next);
    expect(tracker.active).toBe(1);

    res.emit('finish');
    expect(tracker.active).toBe(0);

    // Subsequent emissions must be no-ops — listeners are removed.
    res.emit('finish');
    res.emit('finish');
    expect(tracker.active).toBe(0);
  });

  it('decrements the tracker when res emits `close` (e.g. aborted request)', () => {
    const { res, next } = makeReqRes();
    middleware.use({} as never, res as never, next);
    expect(tracker.active).toBe(1);

    res.emit('close');
    expect(tracker.active).toBe(0);
  });

  it('only decrements once even if both `finish` and `close` fire', () => {
    const { res, next } = makeReqRes();
    middleware.use({} as never, res as never, next);
    expect(tracker.active).toBe(1);

    res.emit('finish');
    expect(tracker.active).toBe(0);

    // If `close` arrives after `finish`, no negative overshoot.
    res.emit('close');
    expect(tracker.active).toBe(0);
  });

  it('floors at zero if `close` fires before `finish` (defensive)', () => {
    const { res, next } = makeReqRes();
    middleware.use({} as never, res as never, next);
    expect(tracker.active).toBe(1);

    res.emit('close');
    res.emit('finish');
    expect(tracker.active).toBe(0);
  });

  it('tracks multiple concurrent requests independently', () => {
    const r1 = makeReqRes();
    const r2 = makeReqRes();
    middleware.use(r1.req as never, r1.res as never, r1.next);
    middleware.use(r2.req as never, r2.res as never, r2.next);
    expect(tracker.active).toBe(2);

    r1.res.emit('finish');
    expect(tracker.active).toBe(1);

    r2.res.emit('close');
    expect(tracker.active).toBe(0);
  });
});
