import { PartialType, OmitType } from "@nestjs/mapped-types"
import { CreateGistDto } from "./create-gist.dto"

export class UpdateGistDto extends PartialType(OmitType(CreateGistDto, ["latitude", "longitude"] as const)) {
  // Location cannot be updated after creation for data integrity
}
