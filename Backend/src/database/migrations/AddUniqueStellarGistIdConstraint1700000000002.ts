import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #98 — adds a UNIQUE constraint on `stellar_gist_id` so that two
 * concurrent create requests producing the same on-chain gist ID collide
 * at the database layer instead of producing duplicate indexer rows.
 *
 * Postgres treats NULLs as distinct in a UNIQUE constraint, so rows without
 * an on-chain ID (e.g. legacy rows or pre-Soroban indexer entries) are not
 * affected by this constraint.
 *
 * The migration is idempotent: wrapped in a `DO $$ ... EXCEPTION
 * WHEN duplicate_object THEN NULL ... END $$;` block because Postgres has no
 * `ADD CONSTRAINT IF NOT EXISTS` syntax. Safe to re-run after a partial
 * rollback or a failed CI apply.
 */
export class AddUniqueStellarGistIdConstraint1700000000002 implements MigrationInterface {
  name = 'AddUniqueStellarGistIdConstraint1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "gists"
          ADD CONSTRAINT "uq_gists_stellar_gist_id" UNIQUE ("stellar_gist_id");
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "gists"
          DROP CONSTRAINT "uq_gists_stellar_gist_id";
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;
    `);
  }
}
