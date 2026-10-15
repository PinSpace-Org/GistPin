import { DataSource } from 'typeorm';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let query: jest.Mock;
  let controller: HealthController;

  beforeEach(() => {
    query = jest.fn();
    controller = new HealthController({ query } as unknown as DataSource);
  });

  it('reports ok when the database and PostGIS checks pass', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]).mockResolvedValueOnce([{ version: '3.4.0' }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.services.database).toEqual({ status: 'ok' });
    expect(result.services.postgis).toEqual({ status: 'ok', message: 'PostGIS 3.4.0' });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('reports degraded and surfaces the message when the database check fails', async () => {
    query
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce([{ version: '3.4.0' }]);

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toEqual({ status: 'error', message: 'connection refused' });
    expect(result.services.postgis.status).toBe('ok');
  });

  it('reports degraded and surfaces the message when the PostGIS check fails', async () => {
    query
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockRejectedValueOnce(new Error('function postgis_lib_version() does not exist'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database.status).toBe('ok');
    expect(result.services.postgis).toEqual({
      status: 'error',
      message: 'function postgis_lib_version() does not exist',
    });
  });

  it('reports degraded with both errors when both checks fail', async () => {
    query.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce(new Error('no postgis'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toEqual({ status: 'error', message: 'db down' });
    expect(result.services.postgis).toEqual({ status: 'error', message: 'no postgis' });
  });
});
