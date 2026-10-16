import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: ArgumentsHost;
  let originalEnv: string | undefined;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    originalEnv = process.env.NODE_ENV;

    mockRequest = {
      url: '/test-endpoint',
      method: 'GET',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('HttpException handling', () => {
    it('passes through HttpException status and string message', () => {
      const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          path: '/test-endpoint',
          message: 'Forbidden resource',
          timestamp: expect.any(String),
        }),
      );
    });

    it('passes through HttpException object response with string message', () => {
      const exception = new HttpException(
        { message: 'Custom error occurred', error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          path: '/test-endpoint',
          message: 'Custom error occurred',
          timestamp: expect.any(String),
        }),
      );
    });

    it('passes through array of messages (e.g. from class-validator validation pipe)', () => {
      const validationMessages = ['field1 must be a string', 'field2 must be an email'];
      const exception = new HttpException(
        { message: validationMessages, error: 'Bad Request' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          path: '/test-endpoint',
          message: validationMessages,
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('Unknown / Unhandled Error handling', () => {
    it('maps unknown Error to 500 with the real message when in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Database connection failed');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          path: '/test-endpoint',
          message: 'Database connection failed',
          timestamp: expect.any(String),
        }),
      );
    });

    it('maps unknown Error to 500 with "Internal server error" when NODE_ENV=production (redaction)', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Secret database credentials leaked in exception');

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          path: '/test-endpoint',
          message: 'Internal server error',
          timestamp: expect.any(String),
        }),
      );
    });

    it('handles non-Error objects gracefully in development', () => {
      process.env.NODE_ENV = 'development';
      const nonError = 'some string thrown';

      filter.catch(nonError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          path: '/test-endpoint',
          message: 'Unknown error',
          timestamp: expect.any(String),
        }),
      );
    });

    it('sets ISO timestamp and request url path on the error response', () => {
      process.env.NODE_ENV = 'development';
      mockRequest.url = '/api/v1/gists/123';
      const error = new Error('Something went wrong');

      const before = new Date().getTime();
      filter.catch(error, mockArgumentsHost);
      const after = new Date().getTime();

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/v1/gists/123');

      const timestampMillis = new Date(jsonCall.timestamp).getTime();
      expect(timestampMillis).toBeGreaterThanOrEqual(before);
      expect(timestampMillis).toBeLessThanOrEqual(after);
    });
  });
});
