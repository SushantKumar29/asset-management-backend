import { rabbitMqChannel } from '../config/rabbitmq';
import logger from '../utils/logger';

export const generateReport = async (
  userId: string,
  reportType: string,
  dateRange?: { start: Date; end: Date },
  action?: string
) => {
  try {
    // Send report request to queue for report generation
    rabbitMqChannel.sendToQueue(
      'asset_processing',
      Buffer.from(
        JSON.stringify({
          action: 'report',
          userId,
          reportType, // usage, performance, compliance, summary
          dateRange: dateRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
          },
          trackingAction: action, // view | download
          triggeredAt: new Date().toISOString(),
        })
      )
    );

    logger.info(`✅ Report trigger sent: ${reportType} report for user ${userId}`);

    return {
      success: true,
      message: 'Report generation started',
      reportType,
      userId,
    };
  } catch (error) {
    logger.error('❌ Failed to trigger report:', error);
    throw error;
  }
};
