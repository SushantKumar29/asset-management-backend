import { db } from '../config/database';
import { ASSET_STATUS } from '../constants/assetStatus';

export const assetService = {
  async updateAfterProcessing(
    assetId: string,
    status: string,
    processingResults: unknown,
    processingStatus: unknown
  ) {
    await db.query(
      `UPDATE assets 
       SET status = $1, 
           metadata = metadata || $2::jsonb,
           processing_status = processing_status || $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        status,
        JSON.stringify({ processing: processingResults }),
        JSON.stringify(processingStatus),
        assetId,
      ]
    );
  },

  async updateOnFailure(assetId: string, error: unknown) {
    await db.query(
      `UPDATE assets 
       SET status = $1, 
           processing_status = processing_status || $2::jsonb
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [ASSET_STATUS.failed, JSON.stringify({ main_processing: { error: String(error) } }), assetId]
    );
  },

  async updateDuplicateInfo(assetId: string, duplicateInfo: unknown) {
    await db.query(
      `UPDATE assets 
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{duplicates}',
         $1
       )
       WHERE id = $2`,
      [JSON.stringify(duplicateInfo), assetId]
    );
  },

  async updateDuplicateCheckStatus(assetId: string, status: unknown) {
    await db.query(
      `UPDATE assets 
       SET processing_status = jsonb_set(
         COALESCE(processing_status, '{}'::jsonb),
         '{duplicate_check}',
         $1
       )
       WHERE id = $2`,
      [JSON.stringify(status), assetId]
    );
  },

  async findDuplicates(checksum: string, assetId: string, userId: string) {
    const result = await db.query(
      `SELECT id, name, file_name, created_at 
       FROM assets 
       WHERE checksum = $1 AND id != $2 AND owner_id = $3`,
      [checksum, assetId, userId]
    );
    return result.rows;
  },
};
