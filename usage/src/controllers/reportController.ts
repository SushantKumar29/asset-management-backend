import { Response } from 'express';
import { reportService } from '../services/reportService';
import { generateReport } from '../helpers/reportGenerate';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth';

// This endpoint is used to generate a report
export const createReport = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { dateRange, action } = req.body;
    const userId = req.user?.id;

    const result = await generateReport(userId, dateRange, action);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// This endpoint is used to get the user's reports
export const getMyReports = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const { limit = 20 } = req.query;

    const reports = await reportService.getUserReports(userId, Number(limit));

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// This endpoint is used to download a report
export const downloadReport = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;

    const report = await reportService.getReportById(reportId, userId);

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.report_type}-report-${
        report.created_at.toISOString().split('T')[0]
      }.json"`
    );

    res.json({
      success: true,
      report: report.data,
      generatedAt: report.created_at,
      reportType: report.report_type,
    });
  } catch (error) {
    next(error);
  }
};
