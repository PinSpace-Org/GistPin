import { Module } from '@nestjs/common';
import { GistsService } from './gists.service';
import { GistsController } from './gists.controller';

@Module({
  controllers: [GistsController],
  providers: [GistsService],
})
export class GistsModule {}
