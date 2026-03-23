import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { usageService } from '../services/usageService';

export const trackUsage = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { assetId } = req.params;
    const { action = 'view', channel = 'web', metadata = {} } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    await usageService.create({ assetId, userId, action, channel, ipAddress, userAgent, metadata });

    res.status(201).json({ success: true, message: 'Usage tracked successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAssetUsage = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { assetId } = req.params;
    const { days = 30 } = req.query;

    const result = await usageService.getAssetUsage(assetId, Number(days));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const { limit = 50 } = req.query;

    const result = await usageService.getRecentActivity(userId, Number(limit));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getUsageSummary = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;

    const result = await usageService.getUsageSummary(userId, Number(days));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
