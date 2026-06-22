import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GistRepository } from './gist.repository';

@Injectable()
export class GistCleanupService {
  private readonly logger = new Logger(GistCleanupService.name);

  constructor(private readonly gistRepository: GistRepository) {}

  /** Issue #604 — delete expired gists every hour. */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredGists(): Promise<void> {
    const deleted = await this.gistRepository.deleteExpired();
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired gist(s)`);
    }
  }
}
