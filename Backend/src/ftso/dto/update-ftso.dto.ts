import { PartialType } from '@nestjs/mapped-types';
import { CreateFtsoDto } from './create-ftso.dto';

export class UpdateFtsoDto extends PartialType(CreateFtsoDto) {}
