import { db } from '../config/database';

export const reportService = {
  // This function is used to get all reports for a user
  async getUserReports(userId: string, limit = 20) {
    const result = await db.query(
      `SELECT id, report_type, date_range, created_at 
       FROM reports 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  // This function is used to get a specific report
  async getReportById(reportId: string, userId: string) {
    const result = await db.query(
      `SELECT * FROM reports 
       WHERE id = $1 AND user_id = $2`,
      [reportId, userId]
    );
    return result.rows[0];
  },

  // This function is used to delete old reports
  async deleteOldReports(days = 30) {
    await db.query(
      `DELETE FROM reports 
       WHERE created_at < NOW() - INTERVAL '${days} days'`
    );
  },
};
