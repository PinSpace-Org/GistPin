import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AlertsService } from "./alerts.service"
import { Alert, AlertSeverity, AlertCategory } from "./entities/alert.entity"
import { jest } from "@jest/globals"

describe("AlertsService", () => {
  let service: AlertsService
  let repository: any // Repository<Alert>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<AlertsService>(AlertsService)
    repository = module.get<Repository<Alert>>(getRepositoryToken(Alert))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("create", () => {
    it("should create a new alert", async () => {
      const createAlertDto = {
        title: "Traffic Alert",
        content: "Heavy traffic on Main Street",
        severity: AlertSeverity.WARNING,
        category: AlertCategory.TRAFFIC,
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 1000,
      }

      const expectedAlert = {
        id: "123",
        ...createAlertDto,
        location: "POINT(-74.0060 40.7128)",
        reporterIp: "192.168.1.1",
        isActive: true,
        viewCount: 0,
        confirmationCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(expectedAlert)
      mockRepository.save.mockResolvedValue(expectedAlert)

      const result = await service.create(createAlertDto, "192.168.1.1")

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createAlertDto,
        reporterIp: "192.168.1.1",
        location: "POINT(-74.0060 40.7128)",
        expiresAt: expect.any(Date),
      })
      expect(mockRepository.save).toHaveBeenCalledWith(expectedAlert)
      expect(result).toEqual(expectedAlert)
    })
  })

  describe("findNearby", () => {
    it("should find nearby alerts", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.findNearby(40.7128, -74.006, 5)

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("alert")
      expect(mockQueryBuilder.where).toHaveBeenCalled()
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })
  })

  describe("findCritical", () => {
    it("should find critical and emergency alerts", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.findCritical()

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("alert")
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("alert.severity IN (:...severities)", {
        severities: [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY],
      })
      expect(result).toEqual([])
    })
  })

  describe("incrementView", () => {
    it("should increment view count", async () => {
      const alertId = "123"
      mockRepository.increment.mockResolvedValue(undefined)

      await service.incrementView(alertId)

      expect(mockRepository.increment).toHaveBeenCalledWith({ id: alertId }, "viewCount", 1)
    })
  })

  describe("cleanupExpired", () => {
    it("should cleanup expired alerts", async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.cleanupExpired()

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled()
      expect(mockQueryBuilder.delete).toHaveBeenCalled()
      expect(mockQueryBuilder.from).toHaveBeenCalledWith(Alert)
      expect(result).toBe(5)
    })
  })
})
