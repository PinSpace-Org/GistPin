import { PartialType } from "@nestjs/mapped-types"
import { CreateTipDto } from "./create-tip.dto"
import type { TipStatus } from "../entities/tip.entity"

export class UpdateTipDto extends PartialType(CreateTipDto) {
  // @IsEnum(TipStatus)
  // @IsOptional()
  status?: TipStatus
}
