import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';
import { Request, Response } from 'express';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total') private readonly requestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method } = req;
    const route = (req.route as { path?: string } | undefined)?.path ?? req.url;
    const stopTimer = this.requestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const status_code = String(res.statusCode);
          stopTimer({ status_code });
          this.requestsTotal.inc({ method, route, status_code });
        },
        error: (err: { status?: number }) => {
          const status_code = err?.status ? String(err.status) : '500';
          stopTimer({ status_code });
          this.requestsTotal.inc({ method, route, status_code });
        },
      }),
    );
  }
}
