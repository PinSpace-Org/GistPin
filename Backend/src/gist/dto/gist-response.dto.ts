import type { Gist } from "../entities/gist.entity"

export class GistResponseDto {
  id: string
  content: string
  type: string
  latitude: number
  longitude: number
  locationName?: string
  category?: string
  metadata?: Record<string, any>
  isActive: boolean
  viewCount: number
  likeCount: number
  distance?: number
  createdAt: Date
  expiresAt?: Date
  isExpired: boolean

  constructor(gist: Gist, distance?: number) {
    this.id = gist.id
    this.content = gist.content
    this.type = gist.type
    this.latitude = gist.latitude
    this.longitude = gist.longitude
    this.locationName = gist.locationName
    this.category = gist.category
    this.metadata = gist.metadata
    this.isActive = gist.isActive
    this.viewCount = gist.viewCount
    this.likeCount = gist.likeCount
    this.distance = distance
    this.createdAt = gist.createdAt
    this.expiresAt = gist.expiresAt
    this.isExpired = gist.expiresAt ? new Date() > gist.expiresAt : false
  }
}
