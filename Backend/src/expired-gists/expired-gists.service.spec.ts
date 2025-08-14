import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ExpiredGistsService } from "./expired-gists.service"
import { ExpiredGist, GistType, CleanupStatus } from "./entities/expired-gist.entity"
import { jest } from "@jest/globals" // Import jest to declare it

describe("ExpiredGistsService", () => {
  let service: ExpiredGistsService
  let repository: Repository<ExpiredGist>

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    })),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpiredGistsService,
        {
          provide: getRepositoryToken(ExpiredGist),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<ExpiredGistsService>(ExpiredGistsService)
    repository = module.get<Repository<ExpiredGist>>(getRepositoryToken(ExpiredGist))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("findAll", () => {
    it("should return paginated expired gists", async () => {
      const mockExpiredGists = [
        {
          id: "1",
          gistType: GistType.STORY,
          originalId: "story-1",
          cleanupStatus: CleanupStatus.PENDING,
        },
      ]

      mockRepository.createQueryBuilder().getManyAndCount.mockResolvedValue([mockExpiredGists, 1])

      const result = await service.findAll({ limit: 10, offset: 0 })

      expect(result).toEqual({
        items: mockExpiredGists,
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      })
    })
  })

  describe("archiveExpiredGist", () => {
    it("should create new archive for expired gist", async () => {
      const mockData = { title: "Test Story", content: "Test content" }
      const mockExpiredGist = {
        id: "1",
        gistType: GistType.STORY,
        originalId: "story-1",
        originalData: mockData,
        cleanupStatus: CleanupStatus.ARCHIVED,
      }

      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue(mockExpiredGist)
      mockRepository.save.mockResolvedValue(mockExpiredGist)

      const result = await service.archiveExpiredGist(GistType.STORY, "story-1", mockData, "Expired due to time limit")

      expect(result).toEqual(mockExpiredGist)
      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalled()
    })
  })

  describe("performCleanup", () => {
    it("should perform dry run cleanup", async () => {
      const mockExpiredGists = [
        { id: "1", gistType: GistType.STORY, cleanupStatus: CleanupStatus.PENDING },
        { id: "2", gistType: GistType.ALERT, cleanupStatus: CleanupStatus.PENDING },
      ]

      mockRepository.createQueryBuilder().getMany.mockResolvedValue(mockExpiredGists)

      const result = await service.performCleanup({
        dryRun: true,
        batchSize: 100,
      })

      expect(result).toEqual({
        processed: 2,
        archived: 0,
        deleted: 0,
      })
    })
  })

  describe("recoverGist", () => {
    it("should recover an archived gist", async () => {
      const mockExpiredGist = {
        id: "1",
        gistType: GistType.STORY,
        originalId: "story-1",
        originalData: { title: "Test Story" },
        cleanupStatus: CleanupStatus.ARCHIVED,
      }

      mockRepository.findOne.mockResolvedValue(mockExpiredGist)
      mockRepository.save.mockResolvedValue({
        ...mockExpiredGist,
        cleanupStatus: CleanupStatus.RECOVERED,
      })

      const result = await service.recoverGist(
        {
          originalId: "story-1",
          gistType: GistType.STORY,
          reason: "User requested recovery",
        },
        "user-123",
      )

      expect(result).toEqual({ title: "Test Story" })
      expect(mockRepository.save).toHaveBeenCalled()
    })
  })

  describe("getCleanupStatistics", () => {
    it("should return cleanup statistics", async () => {
      const mockStats = [
        { gistType: "story", cleanupStatus: "pending", count: "5" },
        { gistType: "alert", cleanupStatus: "archived", count: "3" },
      ]

      const mockTotalByType = [
        { gistType: "story", total: "8" },
        { gistType: "alert", total: "5" },
      ]

      mockRepository
        .createQueryBuilder()
        .getRawMany.mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockTotalByType)

      mockRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        lastCleanup: new Date("2024-01-01"),
      })

      const result = await service.getCleanupStatistics()

      expect(result).toHaveProperty("byTypeAndStatus")
      expect(result).toHaveProperty("totalByType")
      expect(result).toHaveProperty("lastCleanup")
    })
  })
})
