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

export const setupDatabase = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        path VARCHAR(500),
        checksum VARCHAR(64) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        processing_status JSONB DEFAULT '{"thumbnails": false, "metadata": false, "duplicate_check": false}',
        metadata JSONB,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_tags (
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (asset_id, tag_id)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_checksum ON assets(checksum) WHERE checksum IS NOT NULL
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_owner_status ON assets(owner_id, status)
    `);

    logger.info('✅ Asset database setup completed');
  } catch (error) {
    logger.error('❌ Asset database setup failed:', error);
    throw error;
  }
};
