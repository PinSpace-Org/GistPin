import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGistHiddenColumn1750000000003 implements MigrationInterface {
  name = 'AddGistHiddenColumn1750000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_gists_hidden"
        ON "gists" ("hidden")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gists_hidden"`);
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "hidden"`);
  }
}
