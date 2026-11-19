import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

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

const serviceStatusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'error'] },
    message: { type: 'string', nullable: true },
  },
};

const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded'] },
    timestamp: { type: 'string', format: 'date-time' },
    services: {
      type: 'object',
      properties: {
        database: serviceStatusSchema,
        postgis: serviceStatusSchema,
      },
    },
  },
};

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Check database and PostGIS connectivity' })
  @ApiOkResponse({
    description: 'Service health, status is "ok" or "degraded" if a dependency failed',
    schema: healthResponseSchema,
  })
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
