import { db } from '../config/database';

/*
  This is the asset service which handles the DB operations on the assets table
  This service is currently being used by the assetsController
*/

export const assetService = {
  // This functions is used to check if asset already exists
  async findDuplicate(checksum: string, userId: string) {
    const result = await db.query(
      'SELECT id, name FROM assets WHERE checksum = $1 AND owner_id = $2',
      [checksum, userId]
    );
    return result.rows[0];
  },

  // THis function is used to create a new asset
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

  // This function is used to fetch all the assets for a user
  async findAll(userId: string, status?: string, limit = 50, offset = 0) {
    let query = 'SELECT * FROM assets WHERE owner_id = $1';
    const params: unknown[] = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  },

  // THis function is used to count the number of assets for a user
  async count(userId: string) {
    const result = await db.query('SELECT COUNT(*) FROM assets WHERE owner_id = $1', [userId]);
    return Number(result.rows[0].count);
  },

  // THis function is used to fetch an asset by ID
  async findById(id: string, userId: string) {
    const result = await db.query('SELECT * FROM assets WHERE id = $1 AND owner_id = $2', [
      id,
      userId,
    ]);
    return result.rows[0];
  },

  // This function is used to fetch the file name of an asset by ID and Owner ID
  async getFileName(id: string, userId: string) {
    const result = await db.query('SELECT file_name FROM assets WHERE id = $1 AND owner_id = $2', [
      id,
      userId,
    ]);
    return result.rows[0];
  },

  // This function is used to delete an asset by ID
  async delete(id: string) {
    await db.query('DELETE FROM assets WHERE id = $1', [id]);
  },
};
