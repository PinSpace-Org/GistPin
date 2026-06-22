import { DataSource } from 'typeorm';

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'gist',
  DATABASE_PASSWORD: 'gist',
  DATABASE_NAME: 'gist_test',
  DB_POOL_MAX: '5',
  DB_POOL_MIN: '1',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  CONTRACT_ID_GIST_REGISTRY: '',
  STELLAR_SECRET_KEY: '',
  PINATA_API_KEY: '',
  PINATA_SECRET_KEY: '',
  CORS_ORIGINS: '',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

export async function prepareTestDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis');
  await dataSource.runMigrations();
}

export async function truncateGistsTable(dataSource: DataSource): Promise<void> {
  await dataSource.query('TRUNCATE TABLE gists RESTART IDENTITY CASCADE');
}
