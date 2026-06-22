import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGistExpiresAt1750000000002 implements MigrationInterface {
  name = 'AddGistExpiresAt1750000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_gists_expires_at"
        ON "gists" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gists_expires_at"`);
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "expires_at"`);
  }
}
