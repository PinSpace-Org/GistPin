import { ApiProperty } from '@nestjs/swagger';

export class ReportGistResponseDto {
  @ApiProperty({ description: 'On-chain gist ID of the reported gist', example: 'gist-1' })
  gist_id: string;

  @ApiProperty({ description: 'New report count after this report', example: 1 })
  report_count: number;
}
