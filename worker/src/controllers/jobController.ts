import { Response, NextFunction } from 'express';
import { jobService } from '../services/jobService';
import { AuthRequest } from '../types/auth';

export const getJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const jobs = await jobService.getJobs(Number(limit), Number(offset), status as string);
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

export const getJobDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const job = await jobService.getJobDetails(id);
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};
