import { db } from '../config/database';

export const metadataService = {
  async upsert(
    assetId: string,
    key: string, // Represents what type of metadata it is ('description', 'author', 'resolution', 'processing_status' etc)
    value: string, // Represents value of the metadata ('High resolution image', 'John Doe', '1920x1080', 'completed' etc)
    data: unknown,
    type: string = 'jsonb',
    userId: string
  ) {
    await db.query(
      `INSERT INTO metadata (asset_id, key, value, data, type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (asset_id, key) DO UPDATE 
       SET data = EXCLUDED.data, 
           value = EXCLUDED.value,
           updated_at = CURRENT_TIMESTAMP`,
      [assetId, key, value, JSON.stringify(data), type, userId]
    );
  },
};
