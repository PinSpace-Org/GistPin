import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { correlationStore, getCorrelationId } from '../logger/correlation-id.store';
import { Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses an incoming x-correlation-id header, echoes it on the response, and sets the correlation store inside next()', (done) => {
    const incomingId = 'existing-correlation-id-123';
    mockRequest.headers = {
      'x-correlation-id': incomingId,
    };

    nextFunction.mockImplementation(() => {
      expect(correlationStore.getStore()).toEqual({ id: incomingId });
      expect(getCorrelationId()).toBe(incomingId);
      done();
    });

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', incomingId);
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('generates a new uuid when x-correlation-id header is absent, echoes it on the response, and sets the correlation store inside next()', (done) => {
    mockRequest.headers = {};

    let capturedId: string | undefined;
    (mockResponse.setHeader as jest.Mock).mockImplementation((header: string, val: string) => {
      if (header === 'x-correlation-id') {
        capturedId = val;
      }
    });

    nextFunction.mockImplementation(() => {
      expect(capturedId).toBeDefined();
      // Validates UUID v4 pattern
      expect(capturedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(correlationStore.getStore()).toEqual({ id: capturedId });
      expect(getCorrelationId()).toBe(capturedId);
      done();
    });

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });
});
