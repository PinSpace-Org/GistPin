import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { correlationStore } from '../logger/correlation-id.store';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    res.setHeader('x-correlation-id', id);
    correlationStore.run({ id }, next);
  }
}
