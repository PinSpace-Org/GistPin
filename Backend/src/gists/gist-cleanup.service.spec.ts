import { Logger } from '@nestjs/common';

import { GistCleanupService } from './gist-cleanup.service';
import { GistRepository } from './gist.repository';

describe('GistCleanupService', () => {
  let deleteExpired: jest.Mock;
  let service: GistCleanupService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    deleteExpired = jest.fn();
    service = new GistCleanupService({ deleteExpired } as unknown as GistRepository);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('calls deleteExpired and logs the count when gists were removed', async () => {
    deleteExpired.mockResolvedValue(3);

    await service.handleExpiredGists();

    expect(deleteExpired).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Cleaned up 3 expired gist(s)');
  });

  it('does not log when nothing expired', async () => {
    deleteExpired.mockResolvedValue(0);

    await service.handleExpiredGists();

    expect(deleteExpired).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('lets a repository error propagate (the method does not catch)', async () => {
    deleteExpired.mockRejectedValue(new Error('db unavailable'));

    await expect(service.handleExpiredGists()).rejects.toThrow('db unavailable');
    expect(logSpy).not.toHaveBeenCalled();
  });
});
