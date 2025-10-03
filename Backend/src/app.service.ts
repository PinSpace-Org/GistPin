import { Injectable, OnModuleInit } from '@nestjs/common';
import { FtsoService } from './ftso/ftso.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly ftsoService: FtsoService) {}

  async onModuleInit() {
    console.log('--- Testing FTSO Service ---');
    await this.ftsoService.getPrice('SGB');
    await this.ftsoService.calculateDynamicCostInUSD(1, 'SGB');
    console.log('--- FTSO Test Complete ---');
  }

  getHello(): string {
    return 'Hello World!';
  }
}
