import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

const ftsoRegistryAbi = [
  'function getFtso(string memory _symbol) external view returns (address)',
];

const ftsoAbi = [
  'function getCurrentPriceWithDecimals() external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)',
];

export interface PriceData {
  price: number;
  timestamp: number;
  decimals: number;
}

@Injectable()
export class FtsoService {
  private readonly logger = new Logger(FtsoService.name);
  private provider: ethers.JsonRpcProvider;
  private ftsoRegistry: ethers.Contract;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('FLARE_RPC_URL');
    const registryAddress = this.configService.get<string>(
      'FTSO_REGISTRY_ADDRESS',
    );

    if (!rpcUrl || !registryAddress) {
      throw new Error(
        'Flare RPC URL or FTSO Registry Address not configured in .env',
      );
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.ftsoRegistry = new ethers.Contract(
      registryAddress,
      ftsoRegistryAbi,
      this.provider,
    );
    this.logger.log('FtsoService initialized and connected to Flare network');
  }

  async getPrice(symbol: string): Promise<PriceData> {
    try {
      this.logger.log(`1. Finding FTSO contract for symbol: ${symbol}`);
      const ftsoAddress = await this.ftsoRegistry.getFtso(symbol);

      if (ftsoAddress === ethers.ZeroAddress) {
        throw new Error(`FTSO for symbol "${symbol}" not found.`);
      }
      this.logger.log(`   - Found at address: ${ftsoAddress}`);

      const ftsoContract = new ethers.Contract(
        ftsoAddress,
        ftsoAbi,
        this.provider,
      );

      this.logger.log(`2. Fetching latest price from FTSO contract...`);
      const { _price, _timestamp, _decimals } =
        await ftsoContract.getCurrentPriceWithDecimals();

      const price = Number(_price) / 10 ** Number(_decimals);
      const timestamp = Number(_timestamp);

      this.logger.log(`   - Price: ${price} USD`);
      this.logger.log(
        `   - Last updated: ${new Date(timestamp * 1000).toLocaleString()}`,
      );

      return { price, timestamp, decimals: Number(_decimals) };
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}:`, error.message);
      throw error;
    }
  }

  async calculateDynamicCostInUSD(
    baseTokenAmount: number,
    tokenSymbol: string,
  ): Promise<{ usdCost: number; tokenCost: number }> {
    const { price } = await this.getPrice(tokenSymbol);
    const usdCost = 0.1;

    const tokenCost = usdCost / price;

    this.logger.log(
      `To charge $${usdCost}, user needs to pay ${tokenCost.toFixed(5)} ${tokenSymbol}`,
    );

    return { usdCost, tokenCost };
  }
}
