import { Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { AuthRequest } from '../types/auth';

export const getAssetSummary = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;

    const summary = await analyticsService.getAssetSummary(userId);

    res.json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};

export const getAssetsByType = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;

    const result = await analyticsService.getAssetsByType(userId);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getPopularAssets = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, days = 30 } = req.query;

    const result = await analyticsService.getPopularAssets(userId, Number(limit), Number(days));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
