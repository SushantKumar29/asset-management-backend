import { db } from '../config/database';

/*
  This is the asset service which handles the DB operations on the assets table
  This service is currently being used by the assetsController
*/

export const usageService = {
  // This function is used to create a new usage log
  async create(data: {
    assetId: string;
    userId?: string;
    action: string;
    channel?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    const result = await db.query(
      `INSERT INTO usage_logs (asset_id, user_id, action, channel, ip_address, user_agent, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)`,
      [
        data.assetId,
        data.userId || null,
        data.action,
        data.channel || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.metadata || {},
      ]
    );
    return result.rows[0];
  },

  // This function is used to get usage logs for an asset
  async getAssetUsage(assetId: string, days: number) {
    const result = await db.query(
      `SELECT 
         DATE(created_at) as date,
         action,
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users
       FROM usage_logs
       WHERE asset_id = $1::uuid 
         AND created_at >= CURRENT_DATE - $2::integer
       GROUP BY DATE(created_at), action
       ORDER BY date DESC`,
      [assetId, days]
    );
    return result.rows;
  },

  // This function is used to get recent activity for a user
  async getRecentActivity(userId: string, limit: number) {
    const result = await db.query(
      `SELECT * FROM usage_logs
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },

  // This function is used to get the usage summary for a user
  async getUsageSummary(userId: string, days: number) {
    const result = await db.query(
      `SELECT 
         COUNT(DISTINCT asset_id) as assets_used,
         COUNT(*) as total_actions,
         COUNT(DISTINCT action) as unique_actions,
         MAX(created_at) as last_activity
       FROM usage_logs
       WHERE user_id = $1::uuid
         AND created_at >= CURRENT_DATE - $2::integer`,
      [userId, days]
    );
    return result.rows[0];
  },
};
