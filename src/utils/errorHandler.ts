import { Request, Response, NextFunction } from 'express';
import { log } from './logger';

// Define a custom error interface
interface CustomError extends Error {
  status?: number;
  code?: string;
}

// Centralized error handling middleware
export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Internal Server Error';

  // Log the error
  log.error(`Error: ${errorCode} - ${message}`);
  log.error(err.stack);

  // Send a standardized error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: message
    }
  });
};

// Example function to simulate graceful degradation
export const handleFallback = (req: Request, res: Response) => {
  log.warn('Service unavailable, using fallback data');
  res.status(503).json({
    message: 'Service unavailable, using cached data'
  });
};