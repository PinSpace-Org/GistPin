import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostGIS1700000000000 implements MigrationInterface {
  name = 'EnablePostGIS1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: Dropping PostGIS is destructive — only do this intentionally
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis_topology`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis`);
  }
}
