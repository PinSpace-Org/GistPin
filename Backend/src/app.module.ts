import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GistsModule } from './gists/gists.module';

@Module({
  imports: [GistsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
