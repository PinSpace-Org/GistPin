import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthorAddressColumn1750000000001 implements MigrationInterface {
  name = 'AddAuthorAddressColumn1750000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gists"
        ADD COLUMN IF NOT EXISTS "author_address" VARCHAR(80)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_gists_author_address"
        ON "gists" ("author_address")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_gists_author_address"`);
    await queryRunner.query(`ALTER TABLE "gists" DROP COLUMN IF EXISTS "author_address"`);
  }
}
