// export class UpdateAlertDto extends PartialType(CreateAlertDto) {}

export class UpdateAlertDto {
  title?: string
  content?: string
  severity?: string
  category?: string
  radiusMeters?: number
  expiresAt?: string
  isActive?: boolean
  isVerified?: boolean
  metadata?: Record<string, any>
}
