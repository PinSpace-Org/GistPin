import { Injectable } from '@nestjs/common';
import { CreateGistDto } from './dto/create-gist.dto';
import { Gist } from './entities/gist.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class GistsService {
  private gists: Gist[] = [];
  create(createGistDto: CreateGistDto): Gist {
    const gist: Gist = {
      id: randomUUID(),
      ...createGistDto,
      createdAt: new Date(),
    };

    this.gists.push(gist);
    return gist;
  }
}
