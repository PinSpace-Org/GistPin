import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GistsModule } from './gists/gists.module';
import { FtsoModule } from './ftso/ftso.module';

@Module({
  imports: [GistsModule, FtsoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
