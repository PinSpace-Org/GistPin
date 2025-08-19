import { Test, type TestingModule } from "@nestjs/testing"
import { StoriesController } from "./stories.controller"
import { StoriesService } from "./stories.service"
import type { CreateStoryDto } from "./dto/create-story.dto"
import type { UpdateStoryDto } from "./dto/update-story.dto"
import type { QueryStoriesDto } from "./dto/query-stories.dto"
import { jest } from "@jest/globals"

describe("StoriesController", () => {
  let controller: StoriesController
  let service: StoriesService

  const mockStoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    incrementLikes: jest.fn(),
    decrementLikes: jest.fn(),
    findNearby: jest.fn(),
    getStoriesByCategory: jest.fn(),
    cleanupExpiredStories: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [
        {
          provide: StoriesService,
          useValue: mockStoriesService,
        },
      ],
    }).compile()

    controller = module.get<StoriesController>(StoriesController)
    service = module.get<StoriesService>(StoriesService)
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
      }

      const expectedResult = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createStoryDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockStoriesService.create.mockResolvedValue(expectedResult)

      const result = await controller.create(createStoryDto)

      expect(service.create).toHaveBeenCalledWith(createStoryDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findAll", () => {
    it("should return all stories with query parameters", async () => {
      const queryDto: QueryStoriesDto = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusKm: 5,
        limit: 10,
        offset: 0,
      }

      const expectedResult = {
        stories: [
          { id: "1", content: "Story 1" },
          { id: "2", content: "Story 2" },
        ],
        total: 2,
        hasMore: false,
      }

      mockStoriesService.findAll.mockResolvedValue(expectedResult)

      const result = await controller.findAll(queryDto)

      expect(service.findAll).toHaveBeenCalledWith(queryDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findOne", () => {
    it("should return a single story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedResult = {
        id: storyId,
        content: "Test story",
        viewCount: 6,
      }

      mockStoriesService.findOne.mockResolvedValue(expectedResult)

      const result = await controller.findOne(storyId)

      expect(service.findOne).toHaveBeenCalledWith(storyId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("update", () => {
    it("should update a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const updateStoryDto: UpdateStoryDto = {
        title: "Updated Title",
        content: "Updated content",
      }

      const expectedResult = {
        id: storyId,
        ...updateStoryDto,
        updatedAt: new Date(),
      }

      mockStoriesService.update.mockResolvedValue(expectedResult)

      const result = await controller.update(storyId, updateStoryDto)

      expect(service.update).toHaveBeenCalledWith(storyId, updateStoryDto)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("remove", () => {
    it("should remove a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"

      mockStoriesService.remove.mockResolvedValue(undefined)

      const result = await controller.remove(storyId)

      expect(service.remove).toHaveBeenCalledWith(storyId)
      expect(result).toBeUndefined()
    })
  })

  describe("like", () => {
    it("should increment likes for a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedResult = {
        id: storyId,
        likeCount: 6,
      }

      mockStoriesService.incrementLikes.mockResolvedValue(expectedResult)

      const result = await controller.like(storyId)

      expect(service.incrementLikes).toHaveBeenCalledWith(storyId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("unlike", () => {
    it("should decrement likes for a story", async () => {
      const storyId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedResult = {
        id: storyId,
        likeCount: 4,
      }

      mockStoriesService.decrementLikes.mockResolvedValue(expectedResult)

      const result = await controller.unlike(storyId)

      expect(service.decrementLikes).toHaveBeenCalledWith(storyId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findNearby", () => {
    it("should find nearby stories", async () => {
      const latitude = 40.7128
      const longitude = -74.006
      const radiusKm = 5
      const limit = 20

      const expectedResult = [
        { id: "1", content: "Nearby story 1" },
        { id: "2", content: "Nearby story 2" },
      ]

      mockStoriesService.findNearby.mockResolvedValue(expectedResult)

      const result = await controller.findNearby(latitude, longitude, radiusKm, limit)

      expect(service.findNearby).toHaveBeenCalledWith(latitude, longitude, radiusKm, limit)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("findByCategory", () => {
    it("should find stories by category", async () => {
      const category = "food"
      const expectedResult = [
        { id: "1", content: "Food story 1", category },
        { id: "2", content: "Food story 2", category },
      ]

      mockStoriesService.getStoriesByCategory.mockResolvedValue(expectedResult)

      const result = await controller.findByCategory(category)

      expect(service.getStoriesByCategory).toHaveBeenCalledWith(category)
      expect(result).toEqual(expectedResult)
    })
  })

  describe("cleanupExpired", () => {
    it("should cleanup expired stories", async () => {
      const cleanedCount = 3
      mockStoriesService.cleanupExpiredStories.mockResolvedValue(cleanedCount)

      const result = await controller.cleanupExpired()

      expect(service.cleanupExpiredStories).toHaveBeenCalled()
      expect(result).toEqual({
        message: `Cleaned up ${cleanedCount} expired stories`,
      })
    })
  })
})
