import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGistReportCountColumn1750000000004 implements MigrationInterface {
  name = 'AddGistReportCountColumn1750000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "report_count" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "report_count"`);
  }
}
