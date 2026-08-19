import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndexerState1787117331753 implements MigrationInterface {
    name = 'CreateIndexerState1787117331753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "indexer_state" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "last_processed_ledger" bigint NOT NULL DEFAULT '0', "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_02b7cc34be78502f959feed65aa" UNIQUE ("name"), CONSTRAINT "PK_186a04c706e20d425992635168a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "indexer_state"`);
    }
}
