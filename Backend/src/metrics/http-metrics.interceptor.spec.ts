import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { Counter, Histogram } from 'prom-client';

function makeContext(method: string, url: string, statusCode: number, routePath?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url, route: routePath ? { path: routePath } : undefined }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(value: unknown = null, error?: { status?: number; message?: string }): CallHandler {
  return { handle: () => (error ? throwError(() => error) : of(value)) };
}

function makeMetrics() {
  const stopTimer = jest.fn();
  const counter: Partial<Counter<string>> = { inc: jest.fn() };
  const histogram: Partial<Histogram<string>> = {
    startTimer: jest.fn().mockReturnValue(stopTimer),
  };
  return { counter, histogram, stopTimer };
}

describe('HttpMetricsInterceptor', () => {
  it('should increment counter and stop timer on successful request', (done) => {
    const { counter, histogram, stopTimer } = makeMetrics();
    const interceptor = new HttpMetricsInterceptor(
      counter as Counter<string>,
      histogram as Histogram<string>,
    );

    const ctx = makeContext('GET', '/gists', 200, '/gists');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(histogram.startTimer).toHaveBeenCalledWith({ method: 'GET', route: '/gists' });
        expect(stopTimer).toHaveBeenCalledWith({ status_code: '200' });
        expect(counter.inc).toHaveBeenCalledWith({ method: 'GET', route: '/gists', status_code: '200' });
        done();
      },
    });
  });

  it('should record 4xx status on client error', (done) => {
    const { counter, histogram, stopTimer } = makeMetrics();
    const interceptor = new HttpMetricsInterceptor(
      counter as Counter<string>,
      histogram as Histogram<string>,
    );

    const ctx = makeContext('POST', '/gists', 400, '/gists');
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(counter.inc).toHaveBeenCalledWith(
          expect.objectContaining({ status_code: '400' }),
        );
        done();
      },
    });
  });

  it('should use status from thrown error and still stop timer', (done) => {
    const { counter, histogram, stopTimer } = makeMetrics();
    const interceptor = new HttpMetricsInterceptor(
      counter as Counter<string>,
      histogram as Histogram<string>,
    );

    const ctx = makeContext('DELETE', '/gists/1', 500, '/gists/:id');
    interceptor.intercept(ctx, makeHandler(null, { status: 422 })).subscribe({
      error: () => {
        expect(stopTimer).toHaveBeenCalledWith({ status_code: '422' });
        expect(counter.inc).toHaveBeenCalledWith(
          expect.objectContaining({ status_code: '422' }),
        );
        done();
      },
    });
  });

  it('should default to 500 when thrown error has no status', (done) => {
    const { counter, histogram } = makeMetrics();
    const interceptor = new HttpMetricsInterceptor(
      counter as Counter<string>,
      histogram as Histogram<string>,
    );

    const ctx = makeContext('GET', '/gists', 500);
    interceptor.intercept(ctx, makeHandler(null, {})).subscribe({
      error: () => {
        expect(counter.inc).toHaveBeenCalledWith(
          expect.objectContaining({ status_code: '500' }),
        );
        done();
      },
    });
  });

  it('should fall back to req.url when route path is not resolved yet', (done) => {
    const { counter, histogram } = makeMetrics();
    const interceptor = new HttpMetricsInterceptor(
      counter as Counter<string>,
      histogram as Histogram<string>,
    );

    const ctx = makeContext('GET', '/unknown-path', 404);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(counter.inc).toHaveBeenCalledWith(
          expect.objectContaining({ route: '/unknown-path' }),
        );
        done();
      },
    });
  });
});
