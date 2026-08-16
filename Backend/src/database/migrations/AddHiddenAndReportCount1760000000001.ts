import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHiddenAndReportCount1760000000001 implements MigrationInterface {
  name = 'AddHiddenAndReportCount1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "report_count" INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_gists_hidden"
        ON "gists" ("hidden")
        WHERE "hidden" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gists_hidden"`);
    await queryRunner.query(`
      ALTER TABLE "gists"
        DROP COLUMN IF EXISTS "hidden",
        DROP COLUMN IF EXISTS "report_count"
    `);
  }
}
