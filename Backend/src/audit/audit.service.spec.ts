import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { AuditService } from "./audit.service"
import { AuditLog, AuditAction, AuditLevel, EntityType } from "./entities/audit-log.entity"
import { jest } from "@jest/globals"

describe("AuditService", () => {
  let service: AuditService
  let repository: Repository<AuditLog>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<AuditService>(AuditService)
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createLog", () => {
    it("should create and save an audit log", async () => {
      const createDto = {
        action: AuditAction.CREATE,
        entityType: EntityType.STORY,
        description: "Story created",
        userId: "user-123",
      }

      const mockAuditLog = { id: "audit-123", ...createDto }
      mockRepository.create.mockReturnValue(mockAuditLog)
      mockRepository.save.mockResolvedValue(mockAuditLog)

      const result = await service.createLog(createDto)

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdAt: expect.any(Date),
      })
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog)
      expect(result).toEqual(mockAuditLog)
    })
  })

  describe("logAction", () => {
    it("should log an action with default INFO level", async () => {
      const mockAuditLog = {
        id: "audit-123",
        action: AuditAction.CREATE,
        entityType: EntityType.STORY,
        description: "Story created",
        level: AuditLevel.INFO,
      }

      mockRepository.create.mockReturnValue(mockAuditLog)
      mockRepository.save.mockResolvedValue(mockAuditLog)

      const result = await service.logAction(AuditAction.CREATE, EntityType.STORY, "Story created")

      expect(result.level).toBe(AuditLevel.INFO)
      expect(result.action).toBe(AuditAction.CREATE)
    })
  })

  describe("logError", () => {
    it("should log an error with ERROR level", async () => {
      const error = new Error("Test error")
      const mockAuditLog = {
        id: "audit-123",
        action: AuditAction.CREATE,
        entityType: EntityType.STORY,
        description: `Error during ${AuditAction.CREATE}: ${error.message}`,
        level: AuditLevel.ERROR,
        isError: true,
        errorMessage: error.message,
        stackTrace: error.stack,
      }

      mockRepository.create.mockReturnValue(mockAuditLog)
      mockRepository.save.mockResolvedValue(mockAuditLog)

      const result = await service.logError(AuditAction.CREATE, EntityType.STORY, error)

      expect(result.level).toBe(AuditLevel.ERROR)
      expect(result.isError).toBe(true)
      expect(result.errorMessage).toBe(error.message)
    })
  })

  describe("findByEntity", () => {
    it("should find audit logs by entity type and ID", async () => {
      const mockLogs = [
        { id: "audit-1", entityType: EntityType.STORY, entityId: "story-123" },
        { id: "audit-2", entityType: EntityType.STORY, entityId: "story-123" },
      ]

      mockRepository.find.mockResolvedValue(mockLogs)

      const result = await service.findByEntity(EntityType.STORY, "story-123")

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { entityType: EntityType.STORY, entityId: "story-123" },
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual(mockLogs)
    })
  })

  describe("findByUser", () => {
    it("should find audit logs by user ID", async () => {
      const mockLogs = [
        { id: "audit-1", userId: "user-123" },
        { id: "audit-2", userId: "user-123" },
      ]

      mockRepository.find.mockResolvedValue(mockLogs)

      const result = await service.findByUser("user-123")

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        order: { createdAt: "DESC" },
        take: 100,
      })
      expect(result).toEqual(mockLogs)
    })
  })

  describe("findErrors", () => {
    it("should find error audit logs", async () => {
      const mockErrorLogs = [
        { id: "audit-1", isError: true },
        { id: "audit-2", isError: true },
      ]

      mockRepository.find.mockResolvedValue(mockErrorLogs)

      const result = await service.findErrors()

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isError: true },
        order: { createdAt: "DESC" },
        take: 100,
      })
      expect(result).toEqual(mockErrorLogs)
    })
  })
})
