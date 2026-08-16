import { ApiProperty } from '@nestjs/swagger';

export class ModeratorResponseDto {
  @ApiProperty({
    description: 'Stellar public key of the current moderator',
    example: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  })
  address: string;
}
