import { db } from '../config/database';

export const analyticsService = {
  // Get asset summary statistics with usage details
  async getAssetSummary(userId: string) {
    const result = await db.query(
      `SELECT 
         COUNT(DISTINCT a.id) as total_assets,
         COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending,
         COUNT(DISTINCT CASE WHEN a.status = 'processed' THEN a.id END) as processed,
         COUNT(DISTINCT CASE WHEN a.status = 'failed' THEN a.id END) as failed,
         COALESCE(SUM(DISTINCT a.file_size), 0) as total_size_bytes,
         COUNT(DISTINCT a.mime_type) as unique_types,
         COALESCE(SUM(CASE WHEN l.action = 'view' THEN 1 ELSE 0 END), 0) as total_views,
         COALESCE(SUM(CASE WHEN l.action = 'download' THEN 1 ELSE 0 END), 0) as total_downloads,
         COALESCE(COUNT(DISTINCT CASE WHEN l.action = 'view' THEN l.user_id END), 0) as unique_viewers,
         COALESCE(COUNT(DISTINCT CASE WHEN l.action = 'download' THEN l.user_id END), 0) as unique_downloaders
       FROM assets a
       LEFT JOIN usage_logs l ON a.id = l.asset_id
       WHERE a.owner_id = $1`,
      [userId]
    );
    return result.rows[0];
  },

  // Get assets grouped by type category with usage stats
  async getAssetsByType(userId: string) {
    const result = await db.query(
      `SELECT 
         CASE 
           WHEN a.mime_type LIKE 'image/%' THEN 'image'
           WHEN a.mime_type LIKE 'video/%' THEN 'video'
           WHEN a.mime_type LIKE 'audio/%' THEN 'audio'
           WHEN a.mime_type LIKE 'text/%' THEN 'document'
           WHEN a.mime_type LIKE 'application/%' THEN 'document'
           WHEN a.mime_type LIKE 'document/%' THEN 'document'
           ELSE 'other'
         END as type,
         COUNT(DISTINCT a.id) as count,
         SUM(DISTINCT a.file_size) as total_size,
         COALESCE(SUM(CASE WHEN l.action = 'view' THEN 1 ELSE 0 END), 0) as total_views,
         COALESCE(SUM(CASE WHEN l.action = 'download' THEN 1 ELSE 0 END), 0) as total_downloads,
         COALESCE(COUNT(DISTINCT CASE WHEN l.action = 'view' THEN l.user_id END), 0) as unique_viewers
       FROM assets a
       LEFT JOIN usage_logs l ON a.id = l.asset_id
       WHERE a.owner_id = $1
       GROUP BY type
       ORDER BY count DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get popular assets with complete usage stats
  async getPopularAssets(userId: string, limit: number, days: number) {
    const result = await db.query(
      `SELECT 
         a.id,
         a.name,
         a.mime_type,
         a.status,
         a.file_size,
         COUNT(CASE WHEN l.action = 'view' THEN 1 END) as views,
         COUNT(DISTINCT CASE WHEN l.action = 'view' THEN l.user_id END) as unique_viewers,
         MAX(CASE WHEN l.action = 'view' THEN l.created_at END) as last_viewed,
         COUNT(CASE WHEN l.action = 'download' THEN 1 END) as downloads,
         COUNT(DISTINCT CASE WHEN l.action = 'download' THEN l.user_id END) as unique_downloaders,
         MAX(CASE WHEN l.action = 'download' THEN l.created_at END) as last_downloaded
       FROM assets a
       LEFT JOIN usage_logs l ON a.id = l.asset_id 
         AND l.created_at >= CURRENT_DATE - $2::integer
       WHERE a.owner_id = $1
       GROUP BY a.id, a.name, a.mime_type, a.status
       ORDER BY views DESC, downloads DESC, last_viewed DESC
       LIMIT $3`,
      [userId, days, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      mime_type: row.mime_type,
      status: row.status,
      file_size: Number(row.file_size) || 0,
      views: Number(row.views) || 0,
      downloads: Number(row.downloads) || 0,
      unique_viewers: Number(row.unique_viewers) || 0,
      unique_downloaders: Number(row.unique_downloaders) || 0,
      last_viewed: row.last_viewed,
      last_downloaded: row.last_downloaded,
      total_usage: (Number(row.views) || 0) + (Number(row.downloads) || 0),
    }));
  },
};
