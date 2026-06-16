import { Logger } from '@nestjs/common';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import * as correlationStore from '../logger/correlation-id.store';

function makeContext(method: string, url: string, statusCode: number, ip = '::1'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url, ip }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(value: unknown = null, error?: Error): CallHandler {
  return { handle: () => (error ? throwError(() => error) : of(value)) };
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(correlationStore, 'getCorrelationId').mockReturnValue('test-corr-id');
  });

  afterEach(() => jest.restoreAllMocks());

  it('should pass through health check routes without logging', (done) => {
    const ctx = makeContext('GET', '/health', 200);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(logSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should also skip /health/* sub-routes', (done) => {
    const ctx = makeContext('GET', '/health/liveness', 200);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(logSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should call logger.log for 2xx responses', (done) => {
    const ctx = makeContext('GET', '/gists', 200);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /gists 200'));
        done();
      },
    });
  });

  it('should include the correlation ID in 2xx log lines', (done) => {
    const ctx = makeContext('POST', '/gists', 201);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[test-corr-id]'));
        done();
      },
    });
  });

  it('should call logger.warn for 4xx responses', (done) => {
    const ctx = makeContext('POST', '/gists', 400);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('POST /gists 400'));
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[test-corr-id]'));
        done();
      },
    });
  });

  it('should call logger.error for 5xx responses', (done) => {
    const ctx = makeContext('GET', '/gists', 500);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('GET /gists 500'));
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[test-corr-id]'));
        done();
      },
    });
  });

  it('should call logger.error on thrown errors and include correlation ID', (done) => {
    const ctx = makeContext('POST', '/gists', 500);
    const err = new Error('something broke');
    interceptor.intercept(ctx, makeHandler(null, err)).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('POST /gists ERROR'),
        );
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[test-corr-id]'));
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('something broke'));
        done();
      },
    });
  });

  it('should include elapsed time in the log line', (done) => {
    const ctx = makeContext('GET', '/gists', 200);
    interceptor.intercept(ctx, makeHandler()).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+ms/));
        done();
      },
    });
  });
});
