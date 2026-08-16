import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #1038 — surface on-chain moderation state over the REST API.
 *
 * Adds Postgres mirrors of the GistRegistry contract's read-only state:
 *   - `is_active`     — contract `is_active(gist_id)`
 *   - `report_count`  — contract `report_count(gist_id)`
 *
 * The indexer keeps both columns fresh (see the "hidden column" and "event
 * persistence" issues); this migration only adds the storage with sane
 * defaults so existing rows stay visible as active until backfilled.
 */
export class AddGistActivityColumns1750000000003 implements MigrationInterface {
  name = 'AddGistActivityColumns1750000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS "report_count" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        DROP COLUMN IF EXISTS "report_count",
        DROP COLUMN IF EXISTS "is_active"
    `);
  }
}
