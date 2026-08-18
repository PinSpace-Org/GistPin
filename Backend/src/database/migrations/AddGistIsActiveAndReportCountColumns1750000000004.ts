import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGistIsActiveAndReportCountColumns1750000000004 implements MigrationInterface {
  name = 'AddGistIsActiveAndReportCountColumns1750000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "report_count" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "report_count"`);
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "is_active"`);
  }
}
