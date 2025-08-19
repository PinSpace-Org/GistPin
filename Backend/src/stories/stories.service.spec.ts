import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { NotFoundException } from "@nestjs/common"
import { StoriesService } from "./stories.service"
import { Story } from "./entities/story.entity"
import type { CreateStoryDto } from "./dto/create-story.dto"
import { type QueryStoriesDto, SortBy, SortOrder } from "./dto/query-stories.dto"
import { jest } from "@jest/globals"

describe("StoriesService", () => {
  let service: StoriesService
  let repository: Repository<Story>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  }

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        {
          provide: getRepositoryToken(Story),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<StoriesService>(StoriesService)
    repository = module.get<Repository<Story>>(getRepositoryToken(Story))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new story", async () => {
      const createStoryDto: CreateStoryDto = {
        content: "Test story content",
        title: "Test Story",
        latitude: 40.7128,
        longitude: -74.006,
        category: "general",
        isAnonymous: true,
      }

      const expectedLocation = {
        type: "Point",
        coordinates: [-74.006, 40.7128],
      }

      const mockStory = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createStoryDto,
        location: expectedLocation,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(mockStory)
      mockRepository.save.mockResolvedValue(mockStory)

      const result = await service.create(createStoryDto)

      expect(mockRepository.create).toHaveBeenCalledWith({
        content: createStoryDto.content,
        title: createStoryDto.title,
        category: createStoryDto.category,
        isAnonymous: createStoryDto.isAnonymous,
        location: expectedLocation,
      })
      expect(mockRepository.save).toHaveBeenCalledWith(mockStory)
      expect(result).toEqual(mockStory)
    })
  })

  describe("findAll", () => {
    it("should return stories with pagination", async () => {
      const queryDto: QueryStoriesDto = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusKm: 5,
        limit: 10,
        offset: 0,
        sortBy: SortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      }

      const mockStories = [
        {
          id: "1",
          content: "Story 1",
          location: { type: "Point", coordinates: [-74.006, 40.7128] },
        },
        {
          id: "2",
          content: "Story 2",
          location: { type: "Point", coordinates: [-74.005, 40.713] },
        },
      ]

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue(mockStories)
      mockQueryBuilder.getCount.mockResolvedValue(2)

      const result = await service.findAll(queryDto)

      expect(result).toEqual({
        stories: mockStories,
        total: 2,
        hasMore: false,
      })
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("story.isActive = :isActive", { isActive: true })
    })

    it("should handle search filtering", async () => {
      const queryDto: QueryStoriesDto = {
        search: "test",
        limit: 10,
        offset: 0,
      }

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue([])
      mockQueryBuilder.getCount.mockResolvedValue(0)

      await service.findAll(queryDto)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(story.content ILIKE :search OR story.title ILIKE :search OR story.locationName ILIKE :search)",
        { search: "%test%" },
      )
    })
  })

  describe("findOne", () => {
    it("should return a story and increment view count", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const mockStory = {
        id: storyId,
        content: "Test story",
        viewCount: 5,
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment.mockResolvedValue(undefined)

      const result = await service.findOne(storyId)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: storyId, isActive: true },
      })
      expect(mockRepository.increment).toHaveBeenCalledWith({ id: storyId }, "viewCount", 1)
      expect(result.viewCount).toBe(6)
    })

    it("should throw NotFoundException when story not found", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne(storyId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("update", () => {
    it("should update a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const updateDto = { title: "Updated Title" }
      const mockStory = {
        id: storyId,
        content: "Test story",
        title: "Original Title",
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment.mockResolvedValue(undefined)
      mockRepository.save.mockResolvedValue({
        ...mockStory,
        ...updateDto,
      })

      const result = await service.update(storyId, updateDto)

      expect(result.title).toBe("Updated Title")
      expect(mockRepository.save).toHaveBeenCalled()
    })
  })

  describe("remove", () => {
    it("should soft delete a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const mockStory = {
        id: storyId,
        content: "Test story",
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment.mockResolvedValue(undefined) // for view count in findOne
      mockRepository.save.mockResolvedValue({
        ...mockStory,
        isActive: false,
      })

      await service.remove(storyId)

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockStory,
        isActive: false,
      })
    })
  })

  describe("incrementLikes", () => {
    it("should increment like count", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const mockStory = {
        id: storyId,
        content: "Test story",
        likeCount: 5,
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment
        .mockResolvedValueOnce(undefined) // for view count in findOne
        .mockResolvedValueOnce(undefined) // for like count

      const result = await service.incrementLikes(storyId)

      expect(mockRepository.increment).toHaveBeenCalledWith({ id: storyId }, "likeCount", 1)
      expect(result.likeCount).toBe(6)
    })
  })

  describe("decrementLikes", () => {
    it("should decrement like count when count is greater than 0", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const mockStory = {
        id: storyId,
        content: "Test story",
        likeCount: 5,
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment.mockResolvedValue(undefined) // for view count in findOne
      mockRepository.decrement.mockResolvedValue(undefined)

      const result = await service.decrementLikes(storyId)

      expect(mockRepository.decrement).toHaveBeenCalledWith({ id: storyId }, "likeCount", 1)
      expect(result.likeCount).toBe(4)
    })

    it("should not decrement like count when count is 0", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const mockStory = {
        id: storyId,
        content: "Test story",
        likeCount: 0,
        isActive: true,
      }

      mockRepository.findOne.mockResolvedValue(mockStory)
      mockRepository.increment.mockResolvedValue(undefined) // for view count in findOne

      const result = await service.decrementLikes(storyId)

      expect(mockRepository.decrement).not.toHaveBeenCalled()
      expect(result.likeCount).toBe(0)
    })
  })

  describe("findNearby", () => {
    it("should find nearby stories", async () => {
      const latitude = 40.7128
      const longitude = -74.006
      const radiusKm = 5
      const limit = 20

      const mockStories = [
        { id: "1", content: "Nearby story 1" },
        { id: "2", content: "Nearby story 2" },
      ]

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue(mockStories)

      const result = await service.findNearby(latitude, longitude, radiusKm, limit)

      expect(result).toEqual(mockStories)
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("story.isActive = :isActive", { isActive: true })
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit)
    })
  })

  describe("getStoriesByCategory", () => {
    it("should return stories by category", async () => {
      const category = "food"
      const mockStories = [
        { id: "1", content: "Food story 1", category },
        { id: "2", content: "Food story 2", category },
      ]

      mockRepository.find.mockResolvedValue(mockStories)

      const result = await service.getStoriesByCategory(category)

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { category, isActive: true },
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual(mockStories)
    })
  })

  describe("cleanupExpiredStories", () => {
    it("should cleanup expired stories", async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.execute.mockResolvedValue({ affected: 3 })

      const result = await service.cleanupExpiredStories()

      expect(result).toBe(3)
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(Story)
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ isActive: false })
    })
  })
})
