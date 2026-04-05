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
      CREATE TABLE IF NOT EXISTS background_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_type VARCHAR(50) NOT NULL,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        error TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS job_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES background_jobs(id) ON DELETE CASCADE,
        step VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status)`);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON background_jobs(created_at)`);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_jobs_asset_id ON background_jobs(asset_id)`);

    logger.info('✅ Worker database setup completed');
  } catch (error) {
    logger.error('❌ Worker database setup failed:', error);
    throw error;
  }
};
