import * as winston from 'winston';
import { buildWinstonOptions } from './winston.config';

// Capture constructor args so we can assert on them without a real FS
const mockDailyRotateInstances: Record<string, unknown>[] = [];

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation((opts: Record<string, unknown>) => {
    const instance = { ...opts, _mock: 'DailyRotateFile' };
    mockDailyRotateInstances.push(instance);
    return instance;
  });
});

jest.mock('./correlation-id.store', () => ({
  getCorrelationId: () => 'test-id',
}));

describe('buildWinstonOptions', () => {
  beforeEach(() => {
    mockDailyRotateInstances.length = 0;
  });

  describe('development mode', () => {
    it('returns debug log level', () => {
      const opts = buildWinstonOptions('development');
      expect(opts.level).toBe('debug');
    });

    it('uses a single Console transport', () => {
      const opts = buildWinstonOptions('development');
      expect(opts.transports).toHaveLength(1);
      expect((opts.transports as winston.transport[])[0]).toBeInstanceOf(
        winston.transports.Console,
      );
    });

    it('does not create any file transports', () => {
      buildWinstonOptions('development');
      expect(mockDailyRotateInstances).toHaveLength(0);
    });
  });

  describe('production mode', () => {
    it('returns info log level', () => {
      const opts = buildWinstonOptions('production');
      expect(opts.level).toBe('info');
    });

    it('uses three transports: Console + 2 file transports', () => {
      const opts = buildWinstonOptions('production');
      expect(opts.transports).toHaveLength(3);
      expect((opts.transports as winston.transport[])[0]).toBeInstanceOf(
        winston.transports.Console,
      );
    });

    it('creates a combined log file transport at info level', () => {
      buildWinstonOptions('production');
      const combined = mockDailyRotateInstances.find((t) =>
        (t.filename as string).includes('combined'),
      );
      expect(combined).toBeDefined();
      expect(combined!.level).toBe('info');
    });

    it('creates an error-only log file transport', () => {
      buildWinstonOptions('production');
      const errorFile = mockDailyRotateInstances.find((t) =>
        (t.filename as string).includes('error'),
      );
      expect(errorFile).toBeDefined();
      expect(errorFile!.level).toBe('error');
    });

    it('uses the default log directory "logs"', () => {
      buildWinstonOptions('production');
      for (const t of mockDailyRotateInstances) {
        expect(t.dirname).toBe('logs');
      }
    });

    it('respects a custom logDir', () => {
      buildWinstonOptions('production', '/var/log/gistpin');
      for (const t of mockDailyRotateInstances) {
        expect(t.dirname).toBe('/var/log/gistpin');
      }
    });

    it('enables zipped archiving', () => {
      buildWinstonOptions('production');
      for (const t of mockDailyRotateInstances) {
        expect(t.zippedArchive).toBe(true);
      }
    });

    it('caps file size at 20m', () => {
      buildWinstonOptions('production');
      for (const t of mockDailyRotateInstances) {
        expect(t.maxSize).toBe('20m');
      }
    });

    it('retains logs for 14 days', () => {
      buildWinstonOptions('production');
      for (const t of mockDailyRotateInstances) {
        expect(t.maxFiles).toBe('14d');
      }
    });

    it('uses daily date pattern', () => {
      buildWinstonOptions('production');
      for (const t of mockDailyRotateInstances) {
        expect(t.datePattern).toBe('YYYY-MM-DD');
      }
    });
  });
});
