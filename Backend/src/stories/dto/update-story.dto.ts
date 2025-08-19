import { PartialType, OmitType } from "@nestjs/mapped-types"
import { CreateStoryDto } from "./create-story.dto"

export class UpdateStoryDto extends PartialType(OmitType(CreateStoryDto, ["latitude", "longitude"] as const)) {}
