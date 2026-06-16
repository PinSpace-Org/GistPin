import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Database — required; no meaningful fallback
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().integer().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // Database pool — optional
  DB_POOL_MAX: Joi.number().integer().min(1).default(10),
  DB_POOL_MIN: Joi.number().integer().min(0).default(2),

  // Soroban / Stellar — optional in dev
  SOROBAN_RPC_URL: Joi.string()
    .uri()
    .default('https://soroban-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: Joi.string().default(
    'Test SDF Network ; September 2015',
  ),
  CONTRACT_ID_GIST_REGISTRY: Joi.string().allow('').default(''),
  STELLAR_SECRET_KEY: Joi.string().allow('').default(''),

  // IPFS (Pinata) — optional; empty means mock CIDs in dev
  PINATA_API_KEY: Joi.string().allow('').default(''),
  PINATA_SECRET_KEY: Joi.string().allow('').default(''),

  // CORS
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // Throttling
  THROTTLE_TTL_MS: Joi.number().integer().min(0).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(10),
});
