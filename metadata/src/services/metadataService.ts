import { db } from '../config/database';

export const metadataService = {
  async checkAssetOwnership(assetId: string, userId: string) {
    const result = await db.query('SELECT id FROM assets WHERE id = $1 AND owner_id = $2', [
      assetId,
      userId,
    ]);
    return result.rows.length > 0;
  },

  async upsert(
    assetId: string,
    key: string,
    value: string,
    data: unknown,
    type: string,
    userId: string
  ) {
    const result = await db.query(
      `INSERT INTO metadata (asset_id, key, value, data, type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (asset_id, key) 
       DO UPDATE SET 
         value = EXCLUDED.value, 
         data = metadata.data || EXCLUDED.data,
         type = EXCLUDED.type, 
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [assetId, key, value, JSON.stringify(data), type, userId]
    );
    return result.rows[0];
  },

  async findAll(assetId: string) {
    const result = await db.query(
      'SELECT id, asset_id, key, value, data, type, created_by, created_at, updated_at FROM metadata WHERE asset_id = $1::uuid ORDER BY key',
      [assetId]
    );
    return result.rows;
  },

  async delete(assetId: string, key: string) {
    const result = await db.query(
      'DELETE FROM metadata WHERE asset_id = $1 AND key = $2 RETURNING id',
      [assetId, key]
    );
    return result.rows[0];
  },
};
