import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { GistService } from "./gist.service"
import { GistController } from "./gist.controller"
import { Gist } from "./entities/gist.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Gist])],
  controllers: [GistController],
  providers: [GistService],
  exports: [GistService], // Export service for use in other modules
})
export class GistModule {}
