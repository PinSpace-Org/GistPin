import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface ServiceStatus {
  status: 'ok' | 'error';
  message?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: ServiceStatus;
    postgis: ServiceStatus;
  };
}

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const database = await this.checkDatabase();
    const postgis = await this.checkPostGIS();

    const allOk = database.status === 'ok' && postgis.status === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database, postgis },
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', message: (err as Error).message };
    }
  }

  private async checkPostGIS(): Promise<ServiceStatus> {
    try {
      const result = await this.dataSource.query<{ version: string }[]>(
        `SELECT postgis_lib_version() AS version`,
      );
      return { status: 'ok', message: `PostGIS ${result[0].version}` };
    } catch (err) {
      return { status: 'error', message: (err as Error).message };
    }
  }
}
