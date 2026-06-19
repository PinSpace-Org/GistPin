import { Module } from '@nestjs/common';
import { InFlightRequestTracker } from './in-flight-tracker.service';
import { InFlightRequestMiddleware } from './in-flight.middleware';

/**
 * # ShutdownModule
 *
 * Provides the in-flight request tracker and the Express middleware that
 * feeds it.
 *
 * ## Why `ShutdownService` is NOT registered here
 *
 * `ShutdownService` depends on the running `INestApplication` instance,
 * which is only available after `NestFactory.create()` finishes and the
 * application context has been initialised. Resolving it through DI would
 * either require a custom factory provider or an `APP_INITIALIZER` hook.
 * Instead the service is instantiated manually in `main.ts` and cached
 * for the lifetime of the process. Registration here would be misleading
 * because nothing in `main.ts` resolves it from the container.
 *
 * If you need to consume `ShutdownService` from another Nest provider,
 * expose it from `main.ts` as a custom token (e.g. `app.get(SHUTDOWN_SERVICE_TOKEN)`)
 * after instantiating it.
 */
@Module({
  providers: [InFlightRequestTracker, InFlightRequestMiddleware],
  exports: [InFlightRequestTracker, InFlightRequestMiddleware],
})
export class ShutdownModule {}
