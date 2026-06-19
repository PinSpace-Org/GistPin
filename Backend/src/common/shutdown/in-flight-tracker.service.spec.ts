import { InFlightRequestTracker } from './in-flight-tracker.service';

describe('InFlightRequestTracker', () => {
  let tracker: InFlightRequestTracker;

  beforeEach(() => {
    tracker = new InFlightRequestTracker();
  });

  describe('start/end/active', () => {
    it('starts at zero', () => {
      expect(tracker.active).toBe(0);
    });

    it('increments on start', () => {
      tracker.start();
      expect(tracker.active).toBe(1);
      tracker.start();
      tracker.start();
      expect(tracker.active).toBe(3);
    });

    it('decrements on end', () => {
      tracker.start();
      tracker.start();
      tracker.end();
      expect(tracker.active).toBe(1);
      tracker.end();
      expect(tracker.active).toBe(0);
    });

    it('floors at zero when end is called more times than start', () => {
      tracker.end();
      expect(tracker.active).toBe(0);
      tracker.end();
      tracker.end();
      expect(tracker.active).toBe(0);
    });
  });

  describe('reset', () => {
    it('returns to zero regardless of state', () => {
      tracker.start();
      tracker.start();
      tracker.reset();
      expect(tracker.active).toBe(0);
    });
  });

  describe('logActive', () => {
    it('does not throw (logger is silent in test env)', () => {
      tracker.start();
      tracker.logActive('test-context');
      expect(tracker.active).toBe(1);
    });
  });
});
