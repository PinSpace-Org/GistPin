import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexedEventsTable1787200000000 implements MigrationInterface {
  name = 'CreateIndexedEventsTable1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "indexed_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_id" character varying NOT NULL,
        "ledger" bigint NOT NULL,
        "event_type" character varying NOT NULL,
        "stellar_gist_id" character varying,
        "observed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "payload" jsonb,
        CONSTRAINT "UQ_indexed_events_event_id" UNIQUE ("event_id"),
        CONSTRAINT "PK_indexed_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_events_event_type" ON "indexed_events" ("event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_events_stellar_gist_id" ON "indexed_events" ("stellar_gist_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_indexed_events_observed_at" ON "indexed_events" ("observed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_indexed_events_observed_at"`);
    await queryRunner.query(`DROP INDEX "IDX_indexed_events_stellar_gist_id"`);
    await queryRunner.query(`DROP INDEX "IDX_indexed_events_event_type"`);
    await queryRunner.query(`DROP TABLE "indexed_events"`);
  }
}
