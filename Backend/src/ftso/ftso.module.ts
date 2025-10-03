import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FtsoService } from './ftso.service';

@Module({
  imports: [ConfigModule],
  providers: [FtsoService],
  exports: [FtsoService],
})
export class FtsoModule {}
