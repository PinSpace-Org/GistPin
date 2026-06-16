import { utilities as nestWinstonUtilities, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { getCorrelationId } from './correlation-id.store';

const correlationFormat = winston.format((info) => {
  info.correlationId = getCorrelationId();
  return info;
});

const jsonFormat = winston.format.combine(
  correlationFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const prettyFormat = winston.format.combine(
  correlationFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  nestWinstonUtilities.format.nestLike('GistPin', { prettyPrint: true, colors: true }),
);

export function buildWinstonOptions(nodeEnv: string): WinstonModuleOptions {
  const isProd = nodeEnv === 'production';

  return {
    level: isProd ? 'info' : 'debug',
    format: isProd ? jsonFormat : prettyFormat,
    transports: [new winston.transports.Console()],
  };
}
