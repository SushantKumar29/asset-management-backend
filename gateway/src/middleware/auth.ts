import { Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { redisClient } from '../config/redis';
import { AuthRequest } from '../types/auth';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check cache first
    const cacheKey = `token:${token}`;
    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // Cache miss - verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Store in cache with 15 minute expiration
    await redisClient.setex(
      cacheKey,
      900, // in seconds = 15 minutes
      JSON.stringify(decoded)
    );

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: `Invalid or expired token ${error}` });
  }
};
