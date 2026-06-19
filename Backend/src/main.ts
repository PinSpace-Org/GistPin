import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { InFlightRequestTracker } from './common/shutdown/in-flight-tracker.service';
import { ShutdownService } from './common/shutdown/shutdown.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Issue 78 — CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:8081'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    maxAge: 86400,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Issue 77 — Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gist API')
    .setDescription('Anonymous hyperlocal messaging on Stellar')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Issue 99 — graceful shutdown handling.
  // ShutdownService depends on the running INestApplication so it cannot
  // be resolved through DI; instantiate it explicitly with refs fetched
  // from the container, then register signal handlers.
  // NOTE: we deliberately do NOT call `app.enableShutdownHooks()` here —
  // it would register its own SIGTERM/SIGINT handlers that call
  // `app.close()`, duplicating the work ShutdownService already does.
  const tracker = app.get(InFlightRequestTracker);
  const configService = app.get(ConfigService);
  const shutdownService = new ShutdownService(app, tracker, configService);

  const handle = (signal: NodeJS.Signals): void => {
    void shutdownService.handleSignal(signal);
  };
  process.on('SIGTERM', handle);
  process.on('SIGINT', handle);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Gist API running on port ${process.env.PORT ?? 3000}`);
  console.log(`Swagger docs → http://localhost:${process.env.PORT ?? 3000}/api/docs`);
  console.log(
    `Graceful shutdown armed (SHUTDOWN_TIMEOUT_MS=${configService.get<number>('SHUTDOWN_TIMEOUT_MS', 25000)})`,
  );
}

void bootstrap();
