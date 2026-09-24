import { EventLogRepository } from './event-log.repository';
import { PG_UNIQUE_VIOLATION } from '../gists/gist.repository';
import type { GistPostedEvent } from '../soroban/soroban.service';

describe('EventLogRepository', () => {
  let repository: { create: jest.Mock; insert: jest.Mock };
  let service: EventLogRepository;

  const event: GistPostedEvent = {
    type: 'gist_posted',
    ledger: 100,
    id: 'evt-1',
    gist: {
      gistId: 'gist-1',
      locationCell: 'u4pruyd',
      contentHash: 'Qm123',
      author: null,
      createdAt: 1700000000,
      expiresAt: 1700086400,
      hidden: false,
    },
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((data) => data),
      insert: jest.fn(),
    };
    service = new EventLogRepository(repository as any);
  });

  it('inserts a row keyed by the event id', async () => {
    repository.insert.mockResolvedValue(undefined);

    await service.record(event);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-1', ledger: 100, eventType: 'gist_posted', stellarGistId: 'gist-1' }),
    );
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a duplicate event id does not throw', async () => {
    repository.insert.mockRejectedValue({ code: PG_UNIQUE_VIOLATION });

    await expect(service.record(event)).resolves.toBeUndefined();
  });

  it('re-throws non-duplicate errors', async () => {
    repository.insert.mockRejectedValue(new Error('connection lost'));

    await expect(service.record(event)).rejects.toThrow('connection lost');
  });
});
