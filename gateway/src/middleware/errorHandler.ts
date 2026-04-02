import { Request, Response } from 'express';
import logger from '../utils/logger';

/*
  App Error class is used to handle the erorrs better with status codes
  When called as: new AppError('Error message', 400)
    Step 1: Error constructor is called first (This creates the base Error object)
    Step 2: Then AppError constructor adds properties (Adds custom statusCode and Overrides the default 'Error' name)
    {
      From Error class:
      -----------------
      message: "Error message",
      stack: "Error: Error message\n    at controller (file.ts:10:5)...",
      name: "UsageError",        // ← Overridden!
      
      From AppError class:
      --------------------
      statusCode: 400           // ← Custom property
    }
*/

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'GatewayError';
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    logger.error('Error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, status: err.statusCode });
  }

  res.status(500).json({ error: 'Internal server error', message: err.message });
};
