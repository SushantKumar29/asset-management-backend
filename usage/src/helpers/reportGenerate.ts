import { rabbitMqChannel } from '../config/rabbitmq';
import logger from '../utils/logger';

// This is a function to trigger report generation
export const generateReport = async (
  userId: string,
  reportType: string,
  dateRange?: unknown,
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
          reportType,
          dateRange: dateRange,
          trackingAction: action, // This is Optional ('view', 'download', etc) | Defaults to 'all'
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
