import { db } from '../config/database';
import { getMimeType } from '../utils/fileUtils';

export const assetService = {
  async findDuplicate(checksum: string, userId: string) {
    const result = await db.query(
      'SELECT id, name FROM assets WHERE checksum = $1 AND owner_id = $2',
      [checksum, userId]
    );
    return result.rows[0];
  },

  async create(assetData: {
    name: string;
    description: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
    path: string;
    checksum: string;
    userId: string;
    metadata: unknown;
  }) {
    const result = await db.query(
      `INSERT INTO assets (name, description, file_name, file_size, mime_type, path, checksum, owner_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        assetData.name,
        assetData.description,
        assetData.fileName,
        assetData.fileSize,
        assetData.mimeType,
        assetData.path,
        assetData.checksum,
        assetData.userId,
        'pending',
        JSON.stringify(assetData.metadata),
      ]
    );
    return result.rows[0];
  },

  async findAll(
    userId: string,
    status?: string,
    type?: string,
    search?: string,
    limit = 50,
    offset = 0
  ) {
    let query = `
      SELECT 
        a.*,
        u.name as owner_name,
        u.email as owner_email,
        COALESCE(views.count, 0) as views,
        COALESCE(downloads.count, 0) as downloads
      FROM assets a
      LEFT JOIN users u ON a.owner_id = u.id
      LEFT JOIN (
        SELECT asset_id, COUNT(*) as count 
        FROM usage_logs 
        WHERE action = 'view'
        GROUP BY asset_id
      ) views ON a.id = views.asset_id
      LEFT JOIN (
        SELECT asset_id, COUNT(*) as count 
        FROM usage_logs 
        WHERE action = 'download'
        GROUP BY asset_id
      ) downloads ON a.id = downloads.asset_id
      WHERE a.owner_id = $1
    `;
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search && search.trim()) {
      query += ` AND (a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (type) {
      const fileType = getMimeType(type.trim());

      if (Array.isArray(fileType)) {
        const conditions = fileType
          .map((_, idx) => `a.mime_type ILIKE $${paramIndex + idx}`)
          .join(' OR ');
        query += ` AND (${conditions})`;
        params.push(...fileType.map((t) => `%${t}%`));
        paramIndex += fileType.length;
      } else {
        query += ` AND a.mime_type ILIKE $${paramIndex}`;
        params.push(`%${fileType}%`);
        paramIndex++;
      }
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  },

  async count(userId: string, status?: string, search?: string) {
    let query = 'SELECT COUNT(*) FROM assets WHERE owner_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search && search.trim()) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const result = await db.query(query, params);
    return Number(result.rows[0].count);
  },

  async findById(id: string, userId: string) {
    const result = await db.query(
      `SELECT 
       a.*,
       u.name as owner_name,
       u.email as owner_email,
       COALESCE(views.count, 0) as views,
       COALESCE(downloads.count, 0) as downloads,
       COALESCE(views.unique_users, 0) as unique_viewers,
       COALESCE(downloads.unique_users, 0) as unique_downloaders
     FROM assets a
     LEFT JOIN users u ON a.owner_id = u.id
     LEFT JOIN (
       SELECT 
         asset_id, 
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users
       FROM usage_logs 
       WHERE action = 'view'
       GROUP BY asset_id
     ) views ON a.id = views.asset_id
     LEFT JOIN (
       SELECT 
         asset_id, 
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users
       FROM usage_logs 
       WHERE action = 'download'
       GROUP BY asset_id
     ) downloads ON a.id = downloads.asset_id
     WHERE a.id = $1 AND a.owner_id = $2`,
      [id, userId]
    );
    return result.rows[0];
  },

  async getFileName(id: string, userId: string) {
    const result = await db.query('SELECT file_name FROM assets WHERE id = $1 AND owner_id = $2', [
      id,
      userId,
    ]);
    return result.rows[0];
  },

  async delete(id: string) {
    await db.query('DELETE FROM assets WHERE id = $1', [id]);
  },
};
