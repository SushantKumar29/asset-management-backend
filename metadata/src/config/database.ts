import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/*
  Here are the details about some of the columns in the metadata table:
  
  key: VARCHAR(255)       // Represents what type of metadata it is ('description', 'author', 'resolution', 'processing_status' etc)
  value: TEXT             // Represents value of the metadata ('High resolution image', 'John Doe', '1920x1080', 'completed' etc)
  data: JSONB             // Stores complex, structured metadata
  type: VARCHAR(50)       // Type of the metadata ('text', 'number', 'date' etc)
  created_by: UUID        // Represents the user who created the metadata  
*/

export const setupDatabase = async () => {
  try {
    // This is the metadata table used to store the metadata for an asset
    await db.query(`
      CREATE TABLE IF NOT EXISTS metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL,
        value TEXT,
        data JSONB DEFAULT '{}',
        type VARCHAR(50) DEFAULT 'text',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asset_id, key)
      )
    `);

    // This index is created to speed up the query of getting the metadata for an asset
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_metadata_asset_id ON metadata(asset_id)
    `);

    // This index is created to speed up the query of getting the metadata for a specific key ('description', 'author', 'resolution', 'processing_status' etc)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_metadata_key ON metadata(key)
    `);

    // This index is created to speed up the query of getting the metadata for a specific user
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_metadata_created_by ON metadata(created_by);
    `);

    logger.info('✅ Metadata database setup completed');
  } catch (error) {
    logger.error('❌ Metadata database setup failed:', error);
    throw error;
  }
};
