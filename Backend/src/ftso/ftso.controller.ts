import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FtsoService } from './ftso.service';
import { CreateFtsoDto } from './dto/create-ftso.dto';
import { UpdateFtsoDto } from './dto/update-ftso.dto';

@Controller('ftso')
export class FtsoController {
  constructor(private readonly ftsoService: FtsoService) {}

  @Post()
  create(@Body() createFtsoDto: CreateFtsoDto) {
    return this.ftsoService.create(createFtsoDto);
  }

  @Get()
  findAll() {
    return this.ftsoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ftsoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFtsoDto: UpdateFtsoDto) {
    return this.ftsoService.update(+id, updateFtsoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ftsoService.remove(+id);
  }
}
