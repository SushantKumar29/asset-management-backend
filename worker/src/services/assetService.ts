import { db } from '../config/database';

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
};
