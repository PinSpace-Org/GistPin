import { utilities as nestWinstonUtilities, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
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

function buildFileTransports(logDir: string): winston.transport[] {
  const sharedOptions = {
    dirname: logDir,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: jsonFormat,
  };

  return [
    new DailyRotateFile({
      ...sharedOptions,
      filename: 'combined-%DATE%.log',
      level: 'info',
    }),
    new DailyRotateFile({
      ...sharedOptions,
      filename: 'error-%DATE%.log',
      level: 'error',
    }),
  ];
}

export function buildWinstonOptions(nodeEnv: string, logDir = 'logs'): WinstonModuleOptions {
  const isProd = nodeEnv === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProd ? jsonFormat : prettyFormat,
    }),
  ];

  if (isProd) {
    transports.push(...buildFileTransports(logDir));
  }

  return {
    level: isProd ? 'info' : 'debug',
    transports,
  };
}
