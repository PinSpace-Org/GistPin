/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'reflect-metadata';
import { IsString, IsNumber } from 'class-validator';

export class CreateGistDto {
  @IsString()
  text: string = '';

  @IsNumber()
  lat: number = 0;

  @IsNumber()
  lng: number = 0;

  @IsString()
  category: string = '';
}
