import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const minimalValidEnv = {
    DATABASE_HOST: 'localhost',
    DATABASE_USER: 'postgres',
    DATABASE_PASSWORD: 'secretpassword',
    DATABASE_NAME: 'gistpin',
  };

  it('provides default values for unspecified optional fields when given minimal required env', () => {
    const { error, value } = envValidationSchema.validate(minimalValidEnv);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.DATABASE_PORT).toBe(5432);
    expect(value.DB_POOL_MAX).toBe(10);
    expect(value.DB_POOL_MIN).toBe(2);
    expect(value.SOROBAN_RPC_URL).toBe('https://soroban-testnet.stellar.org');
    expect(value.STELLAR_NETWORK_PASSPHRASE).toBe('Test SDF Network ; September 2015');
    expect(value.CONTRACT_ID_GIST_REGISTRY).toBe('');
    expect(value.STELLAR_SECRET_KEY).toBe('');
    expect(value.SOROBAN_READ_ACCOUNT).toBe('');
    expect(value.PINATA_API_KEY).toBe('');
    expect(value.PINATA_SECRET_KEY).toBe('');
    expect(value.IPFS_GATEWAY).toBe('https://gateway.pinata.cloud/ipfs');
    expect(value.IPFS_RETRY_ATTEMPTS).toBe(3);
    expect(value.SOROBAN_RETRY_ATTEMPTS).toBe(3);
    expect(value.STATS_CACHE_TTL_MS).toBe(30000);
    expect(value.CORS_ORIGINS).toBe('');
    expect(value.THROTTLE_TTL_MS).toBe(60000);
    expect(value.THROTTLE_LIMIT).toBe(10);
    expect(value.LOG_DIR).toBe('logs');
    expect(value.SHUTDOWN_TIMEOUT_MS).toBe(25000);
  });

  describe('PORT validation', () => {
    it('accepts valid port numbers within range 1 to 65535', () => {
      const { error: err1, value: val1 } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: 1,
      });
      expect(err1).toBeUndefined();
      expect(val1.PORT).toBe(1);

      const { error: err2, value: val2 } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: 65535,
      });
      expect(err2).toBeUndefined();
      expect(val2.PORT).toBe(65535);

      const { error: err3, value: val3 } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: '8080',
      });
      expect(err3).toBeUndefined();
      expect(val3.PORT).toBe(8080);
    });

    it('rejects PORT above 65535', () => {
      const { error } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: 65536,
      });
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('PORT');
    });

    it('rejects PORT below 1 or non-integer', () => {
      const { error: errZero } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: 0,
      });
      expect(errZero).toBeDefined();

      const { error: errNegative } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: -1,
      });
      expect(errNegative).toBeDefined();

      const { error: errFloat } = envValidationSchema.validate({
        ...minimalValidEnv,
        PORT: 3000.5,
      });
      expect(errFloat).toBeDefined();
    });
  });

  describe('NODE_ENV validation', () => {
    it.each(['development', 'production', 'test'])('accepts valid NODE_ENV "%s"', (env) => {
      const { error, value } = envValidationSchema.validate({
        ...minimalValidEnv,
        NODE_ENV: env,
      });
      expect(error).toBeUndefined();
      expect(value.NODE_ENV).toBe(env);
    });

    it('rejects invalid NODE_ENV values like "staging"', () => {
      const { error } = envValidationSchema.validate({
        ...minimalValidEnv,
        NODE_ENV: 'staging',
      });
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('NODE_ENV');
    });
  });

  describe('DATABASE fields validation', () => {
    it('fails when DATABASE_HOST is missing', () => {
      const { DATABASE_HOST, ...envWithoutHost } = minimalValidEnv;
      const { error } = envValidationSchema.validate(envWithoutHost);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('DATABASE_HOST');
    });

    it('fails when DATABASE_USER is missing', () => {
      const { DATABASE_USER, ...envWithoutUser } = minimalValidEnv;
      const { error } = envValidationSchema.validate(envWithoutUser);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('DATABASE_USER');
    });

    it('fails when DATABASE_PASSWORD is missing', () => {
      const { DATABASE_PASSWORD, ...envWithoutPassword } = minimalValidEnv;
      const { error } = envValidationSchema.validate(envWithoutPassword);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('DATABASE_PASSWORD');
    });

    it('fails when DATABASE_NAME is missing', () => {
      const { DATABASE_NAME, ...envWithoutName } = minimalValidEnv;
      const { error } = envValidationSchema.validate(envWithoutName);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('DATABASE_NAME');
    });
  });

  describe('CORS_ORIGINS validation', () => {
    it('accepts an empty string', () => {
      const { error, value } = envValidationSchema.validate({
        ...minimalValidEnv,
        CORS_ORIGINS: '',
      });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGINS).toBe('');
    });

    it('accepts a comma-separated list of origins', () => {
      const { error, value } = envValidationSchema.validate({
        ...minimalValidEnv,
        CORS_ORIGINS: 'http://localhost:3000,https://app.gistpin.io',
      });
      expect(error).toBeUndefined();
      expect(value.CORS_ORIGINS).toBe('http://localhost:3000,https://app.gistpin.io');
    });
  });

  describe('Stellar address pattern validations', () => {
    it('accepts valid Stellar public key for MODERATOR_ADDRESS and SOROBAN_READ_ACCOUNT', () => {
      const validAddress = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
      const { error, value } = envValidationSchema.validate({
        ...minimalValidEnv,
        MODERATOR_ADDRESS: validAddress,
        SOROBAN_READ_ACCOUNT: validAddress,
      });
      expect(error).toBeUndefined();
      expect(value.MODERATOR_ADDRESS).toBe(validAddress);
      expect(value.SOROBAN_READ_ACCOUNT).toBe(validAddress);
    });

    it('rejects invalid Stellar address for MODERATOR_ADDRESS', () => {
      const { error } = envValidationSchema.validate({
        ...minimalValidEnv,
        MODERATOR_ADDRESS: 'invalid-address',
      });
      expect(error).toBeDefined();
      expect(error?.details[0].path).toContain('MODERATOR_ADDRESS');
    });
  });
});
