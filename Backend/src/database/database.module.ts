import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Gist } from '../gists/entities/gist.entity';
import { IndexerState } from '../indexer/indexer-state.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'gist'),
        password: config.get<string>('DATABASE_PASSWORD', 'gist'),
        database: config.get<string>('DATABASE_NAME', 'gist'),
        entities: [Gist, IndexerState],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: false,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') !== 'production',
        extra: {
          max: config.get<number>('DB_POOL_MAX', 10),
          min: config.get<number>('DB_POOL_MIN', 2),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
