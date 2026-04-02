import express from 'express';
import { Response, NextFunction } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import metadataRoutes from '../routes/metadataRoutes';
import { errorHandler } from '../middleware/errorHandler';
import * as dbModule from '../config/database';
import { AuthRequest } from '../types/auth';

jest.mock('../utils/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    key: {
      metadata: jest.fn().mockReturnValue('metadata:test'),
    },
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: AuthRequest, res: Response, next: NextFunction) => {
    req.user = {
      id: req.headers['user-id'] || 'test-user-id',
      email: 'test@test.com',
      role: 'user',
    };
    next();
  },
}));

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const config = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'metadata_management_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

export let pool: Pool;

export const app = express();
app.use(express.json());
app.use('/api/metadata', metadataRoutes);
app.use(errorHandler);

/*
  In the the below beforeAll function, we are creating the DB and tables.
  Here we are using 2 pool instances. We cannot create a database and then immediately use it with the same pool connection because:
  - When we connect to PostgreSQL, we're connected to a specific database (here 'postgres')
  - We can't switch databases on an existing connection
  - To create a new database, we must be connected to a different database (usually 'postgres')
  - After creating the database, we need a new connection to that specific database
*/

beforeAll(async () => {
  const adminPool = new Pool({ ...config, database: 'postgres' });
  await adminPool.query('SELECT 1');

  const result = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
    config.database,
  ]);
  try {
    if (result.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${config.database}`);
      console.log(`✅ Test database "${config.database}" created`);
    }
  } catch (e) {
    console.error('Error in creating test DB', e);
    throw e;
  }
  await adminPool.end();

  pool = new Pool(config);
  await pool.query('SELECT 1');

  await pool.query(`
    DROP TABLE IF EXISTS metadata CASCADE;
    DROP TABLE IF EXISTS assets CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      file_name VARCHAR(255) NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      path VARCHAR(500),
      checksum VARCHAR(64) UNIQUE,
      status VARCHAR(50) DEFAULT 'pending',
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE metadata (
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
    );
  `);

  /* 
    Dependency injection - it replaces the app's database connection with our test database connection
    In the above, we are importing the db from the database.ts and we are overriding the development DB with out test DB here
   */
  // eslint-disable-next-line no-import-assign
  Object.defineProperty(dbModule, 'db', { value: pool });
});

afterAll(async () => {
  await pool?.end();
});
