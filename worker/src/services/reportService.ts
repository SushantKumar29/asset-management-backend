import { db } from '../config/database';

export const reportService = {
  // This function is used to get usage statistics for report
  async getUsageStats(startDate: Date, trackingAction?: string) {
    const params: any[] = [startDate];
    let actionFilter = '';

    if (trackingAction) {
      actionFilter = ` AND action = $2`;
      params.push(trackingAction);
    }

    const result = await db.query(
      `SELECT 
       DATE(created_at) as date,
       action,
       COUNT(*) as count,
       COUNT(DISTINCT asset_id) as unique_assets,
       COUNT(DISTINCT user_id) as unique_users
     FROM usage_logs 
     WHERE created_at >= $1${actionFilter}
     GROUP BY DATE(created_at), action
     ORDER BY date DESC, action`,
      params
    );

    return {
      trackingAction: trackingAction || 'all',
      data: result.rows,
    };
  },

  // This function is used to save a report
  async saveReport(userId: string, reportData: unknown, dateRange: { start: Date; end: Date }) {
    await db.query(
      `INSERT INTO reports (user_id, data, date_range) VALUES ($1, $2, $3) RETURNING id`,
      [userId, JSON.stringify(reportData), JSON.stringify(dateRange)]
    );
  },
};
