import { db } from '../config/database';

export const reportService = {
  async getUsageStats(startDate: Date, endDate: Date, trackingAction?: string) {
    const params: (Date | string)[] = [startDate, endDate];
    let actionFilter = '';

    if (trackingAction) {
      actionFilter = ` AND action = $3`;
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
       WHERE created_at >= $1 AND created_at <= $2${actionFilter}
       GROUP BY DATE(created_at), action
       ORDER BY date DESC, action`,
      params
    );

    const summaryResult = await db.query(
      `SELECT 
         COUNT(*) as total_actions,
         COUNT(DISTINCT asset_id) as total_assets,
         COUNT(DISTINCT user_id) as total_users,
         COUNT(CASE WHEN action = 'view' THEN 1 END) as total_views,
         COUNT(CASE WHEN action = 'download' THEN 1 END) as total_downloads
       FROM usage_logs 
       WHERE created_at >= $1 AND created_at <= $2${actionFilter}`,
      params.slice(0, 2)
    );

    return {
      trackingAction: trackingAction || 'all',
      data: result.rows,
      summary: summaryResult.rows[0],
      period: {
        start: startDate,
        end: endDate,
      },
    };
  },

  async saveReport(userId: string, reportData: unknown, reportType: string, dateRange: unknown) {
    const result = await db.query(
      `INSERT INTO reports (user_id, report_type, data, date_range) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, reportType, JSON.stringify(reportData), JSON.stringify(dateRange)]
    );
    return result.rows[0].id;
  },

  async getPerformanceStats(startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
       DATE(created_at) as date,
       COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
       COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads,
       COUNT(DISTINCT asset_id) as unique_assets,
       AVG(COUNT(*)) OVER() as avg_daily_actions
     FROM usage_logs 
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
      [startDate, endDate]
    );

    return {
      data: result.rows,
      summary: {
        total_views: result.rows.reduce((sum, row) => sum + parseInt(row.views), 0),
        total_downloads: result.rows.reduce((sum, row) => sum + parseInt(row.downloads), 0),
        avg_daily_views:
          result.rows.reduce((sum, row) => sum + parseInt(row.views), 0) / result.rows.length,
      },
    };
  },

  async getComplianceStats(startDate: Date, endDate: Date) {
    const result = await db.query(
      `SELECT 
       asset_id,
       COUNT(*) as total_views,
       COUNT(DISTINCT user_id) as unique_viewers,
       MAX(created_at) as last_viewed
     FROM usage_logs 
     WHERE created_at >= $1 AND created_at <= $2 
       AND action = 'view'
     GROUP BY asset_id
     ORDER BY total_views DESC
     LIMIT 100`,
      [startDate, endDate]
    );

    return {
      data: result.rows,
      summary: {
        total_compliant_assets: result.rows.length,
        total_views: result.rows.reduce((sum, row) => sum + parseInt(row.total_views), 0),
      },
    };
  },
};
