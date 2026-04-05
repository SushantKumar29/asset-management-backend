import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { reportService } from '../services/reportService';
import { generateReport } from '../helpers/reportGenerate';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth';
import { REPORT_ACTION_MAP } from '../constants/reports';

export const createReport = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { type, from, to } = req.body; // type = usage | compliance | performance | summary
    const userId = req.user?.id;

    const result = await generateReport(
      userId,
      type,
      { start: new Date(from), end: new Date(to) },
      REPORT_ACTION_MAP.view // Default view action
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const { limit = 20 } = req.query;

    const reports = await reportService.getUserReports(userId, Number(limit));

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

export const downloadReport = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;

    const report = await reportService.getReportById(reportId, userId);

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const doc = new PDFDocument();
    const filename = `${report.report_type}-report-${
      report.created_at.toISOString().split('T')[0]
    }.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(20).text(`${report.report_type.toUpperCase()} REPORT`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${report.created_at.toLocaleString()}`);
    doc.moveDown();
    doc.text('Report Data:');
    doc.moveDown();
    doc.fontSize(10).text(JSON.stringify(report.data, null, 2));

    doc.end();
  } catch (error) {
    next(error);
  }
};
