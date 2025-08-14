import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

@Entity("gists")
@Index(["latitude", "longitude"]) // Spatial index for location queries
@Index(["createdAt"]) // Index for time-based queries
export class Gist {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "text" })
  content: string

  @Column({ type: "varchar", length: 50 })
  type: string // 'tip', 'alert', 'story', etc.

  @Column({ type: "decimal", precision: 10, scale: 8 })
  latitude: number

  @Column({ type: "decimal", precision: 11, scale: 8 })
  longitude: number

  @Column({ type: "varchar", length: 255, nullable: true })
  locationName?: string // Human-readable location name

  @Column({ type: "varchar", length: 100, nullable: true })
  category?: string // Optional categorization

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any> // Flexible metadata storage

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "boolean", default: false })
  isReported: boolean

  @Column({ type: "int", default: 0 })
  viewCount: number

  @Column({ type: "int", default: 0 })
  likeCount: number

  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date // Optional expiration for temporary gists

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Virtual property to calculate distance (will be set by service)
  distance?: number
}
