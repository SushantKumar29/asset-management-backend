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
    // This is the usage_logs table used to store the usage tracking
    await db.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        channel VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // This is the reports table used to store the data of generated reports
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_type VARCHAR(50) NOT NULL DEFAULT 'usage',
        data JSONB NOT NULL,
        date_range JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // This index is created to speed up the query of getting the usage logs filtered by asset_id and created_at date
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_usage_asset_date ON usage_logs(asset_id, created_at)
    `);

    // This index is created to speed up the query of getting the reports filtered by created_at date
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)
    `);

    // This index is created to speed up the query of getting the reports filtered by user_id
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)
    `);

    logger.info('✅ Usage database setup completed');
  } catch (error) {
    logger.error('❌ Usage database setup failed:', error);
    throw error;
  }
};
