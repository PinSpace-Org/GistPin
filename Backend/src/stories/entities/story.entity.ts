// Copy this file to your NestJS project: src/stories/entities/story.entity.ts

import type { Point } from "typeorm"

// @Entity('stories')
// @Index(['location'], { spatial: true })
// @Index(['createdAt'])
// @Index(['isActive'])
export class Story {
  // @PrimaryGeneratedColumn('uuid')
  id: string

  // @Column({ type: 'text' })
  content: string

  // @Column({ type: 'varchar', length: 100, nullable: true })
  title?: string

  // @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: Point

  // @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string

  // @Column({ type: 'varchar', length: 100, nullable: true })
  locationName?: string

  // @Column({ type: 'varchar', length: 50, default: 'story' })
  category: string

  // @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>

  // @Column({ type: 'boolean', default: true })
  isActive: boolean

  // @Column({ type: 'boolean', default: false })
  isAnonymous: boolean

  // @Column({ type: 'varchar', length: 100, nullable: true })
  authorId?: string

  // @Column({ type: 'int', default: 0 })
  viewCount: number

  // @Column({ type: 'int', default: 0 })
  likeCount: number

  // @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date

  // @CreateDateColumn()
  createdAt: Date

  // @UpdateDateColumn()
  updatedAt: Date
}
