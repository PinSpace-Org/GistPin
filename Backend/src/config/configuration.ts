export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'gist',
    password: process.env.DATABASE_PASSWORD ?? 'gist',
    name: process.env.DATABASE_NAME ?? 'gist',
  },

  soroban: {
    rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    networkPassphrase:
      process.env.STELLAR_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',
    contractIdGistRegistry: process.env.CONTRACT_ID_GIST_REGISTRY ?? '',
    secretKey: process.env.STELLAR_SECRET_KEY ?? '',
  },

  ipfs: {
    pinataApiKey: process.env.PINATA_API_KEY ?? '',
    pinataSecretKey: process.env.PINATA_SECRET_KEY ?? '',
    gateway: process.env.IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs',
  },
});
