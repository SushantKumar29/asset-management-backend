import { db } from '../config/database';

export const analyticsService = {
  // Get asset summary statistics
  async getAssetSummary(userId: string) {
    const result = await db.query(
      `SELECT 
         COUNT(*) as total_assets,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COALESCE(SUM(file_size), 0) as total_size_bytes,
         COUNT(DISTINCT mime_type) as unique_types
       FROM assets
       WHERE owner_id = $1`,
      [userId]
    );
    return result.rows[0];
  },

  // Get assets grouped by type category
  async getAssetsByType(userId: string) {
    const result = await db.query(
      `SELECT 
         CASE 
           WHEN mime_type LIKE 'image/%' THEN 'image'
           WHEN mime_type LIKE 'video/%' THEN 'video'
           WHEN mime_type LIKE 'text/%' THEN 'document'
           WHEN mime_type = 'application/pdf' THEN 'document'
           ELSE 'other'
         END as type,
         COUNT(*) as count,
         SUM(file_size) as total_size
       FROM assets
       WHERE owner_id = $1
       GROUP BY type
       ORDER BY count DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get popular assets based on the view count
  async getPopularAssets(userId: string, limit: number, days: number) {
    const result = await db.query(
      `SELECT 
         a.id,
         a.name,
         a.mime_type,
         COUNT(l.id) as view_count,
         COUNT(DISTINCT l.user_id) as unique_viewers,
         MAX(l.created_at) as last_viewed
       FROM assets a
       LEFT JOIN usage_logs l ON a.id = l.asset_id 
         AND l.created_at >= CURRENT_DATE - $2::integer
       WHERE a.owner_id = $1
       GROUP BY a.id, a.name, a.mime_type
       ORDER BY view_count DESC, last_viewed DESC
       LIMIT $3`,
      [userId, days, limit]
    );
    return result.rows;
  },
};
