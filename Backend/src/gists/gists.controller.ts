// src/gists/gist.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { CreateGistDto } from './dto/create-gist.dto';
import { GistsService } from './gists.service';
import { Gist } from './entities/gist.entity';

@Controller('gists')
export class GistsController {
  constructor(private readonly gistService: GistsService) {}

  @Post()
  create(@Body() createGistDto: CreateGistDto): Gist {
    return this.gistService.create(createGistDto);
  }
}
