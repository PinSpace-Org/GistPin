import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TipsService } from "./tips.service"
import { Tip, TipStatus, TipCategory } from "./entities/tip.entity"
import { NotFoundException } from "@nestjs/common"
import { jest } from "@jest/globals"

describe("TipsService", () => {
  let service: TipsService
  let repository: Repository<Tip>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
    count: jest.fn(),
  }

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsService,
        {
          provide: getRepositoryToken(Tip),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<TipsService>(TipsService)
    repository = module.get<Repository<Tip>>(getRepositoryToken(Tip))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new tip", async () => {
      const createTipDto = {
        content: "Great coffee shop!",
        title: "Best Coffee",
        category: TipCategory.RESTAURANT,
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        country: "USA",
      }

      const expectedTip = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        ...createTipDto,
        location: "POINT(-74.0060 40.7128)",
        status: TipStatus.ACTIVE,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulnessRating: 0,
        isAnonymous: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(expectedTip)
      mockRepository.save.mockResolvedValue(expectedTip)

      const result = await service.create(createTipDto, "127.0.0.1", "test-agent")

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createTipDto,
        location: "POINT(-74.0060 40.7128)",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        expiresAt: null,
      })
      expect(mockRepository.save).toHaveBeenCalledWith(expectedTip)
      expect(result).toEqual(expectedTip)
    })
  })

  describe("findAll", () => {
    it("should return paginated tips", async () => {
      const queryDto = {
        page: 1,
        limit: 20,
        latitude: 40.7128,
        longitude: -74.006,
        radius: 5,
        category: TipCategory.RESTAURANT,
      }

      const mockTips = [
        { id: "1", content: "Tip 1", category: TipCategory.RESTAURANT },
        { id: "2", content: "Tip 2", category: TipCategory.RESTAURANT },
      ]

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTips, 2])

      const result = await service.findAll(queryDto)

      expect(result).toEqual({
        tips: mockTips,
        total: 2,
        page: 1,
        totalPages: 1,
      })
    })
  })

  describe("findOne", () => {
    it("should return a tip by id", async () => {
      const tipId = "123e4567-e89b-12d3-a456-426614174000"
      const expectedTip = {
        id: tipId,
        content: "Great tip!",
        status: TipStatus.ACTIVE,
      }

      mockRepository.findOne.mockResolvedValue(expectedTip)

      const result = await service.findOne(tipId)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: tipId },
      })
      expect(result).toEqual(expectedTip)
    })

    it("should throw NotFoundException when tip not found", async () => {
      const tipId = "non-existent-id"
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findOne(tipId)).rejects.toThrow(NotFoundException)
    })
  })

  describe("findNearby", () => {
    it("should return nearby tips", async () => {
      const mockTips = [
        { id: "1", content: "Nearby tip 1" },
        { id: "2", content: "Nearby tip 2" },
      ]

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getMany.mockResolvedValue(mockTips)

      const result = await service.findNearby(40.7128, -74.006, 5, 20)

      expect(result).toEqual(mockTips)
    })
  })

  describe("markHelpful", () => {
    it("should mark tip as helpful and update rating", async () => {
      const tipId = "123e4567-e89b-12d3-a456-426614174000"
      const tip = {
        id: tipId,
        helpfulCount: 5,
        notHelpfulCount: 2,
        helpfulnessRating: 0,
      }

      mockRepository.findOne.mockResolvedValue(tip)
      mockRepository.save.mockResolvedValue({
        ...tip,
        helpfulCount: 6,
        helpfulnessRating: (6 / 8) * 5,
      })

      const result = await service.markHelpful(tipId, true)

      expect(result.helpfulCount).toBe(6)
      expect(result.helpfulnessRating).toBeCloseTo(3.75)
    })
  })

  describe("expireOldTips", () => {
    it("should expire old tips", async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 })

      const result = await service.expireOldTips()

      expect(result).toBe(5)
    })
  })

  describe("getStatistics", () => {
    it("should return tip statistics", async () => {
      mockRepository.count
        .mockResolvedValueOnce(100) // totalTips
        .mockResolvedValueOnce(80) // activeTips
        .mockResolvedValueOnce(15) // expiredTips

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { category: "restaurant", count: "30" },
          { category: "shopping", count: "25" },
        ])
        .mockResolvedValueOnce([
          { city: "New York", count: "40" },
          { city: "Los Angeles", count: "25" },
        ])

      const result = await service.getStatistics()

      expect(result.totalTips).toBe(100)
      expect(result.activeTips).toBe(80)
      expect(result.expiredTips).toBe(15)
      expect(result.categoryStats).toHaveLength(2)
      expect(result.topCities).toHaveLength(2)
    })
  })
})
