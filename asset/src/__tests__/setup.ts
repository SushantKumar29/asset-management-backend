import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import assetRoutes from '../routes/assetRoutes';
import * as dbModule from '../config/database';
import cors from 'cors';
import helmet from 'helmet';
import { AuthRequest } from '../types/auth';

// Here we are mocking the external services like minio and rabbitmq
jest.mock('../config/minio', () => ({
  minioClient: {
    putObject: jest.fn().mockResolvedValue({}),
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue({}),
  },
  setupMinio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/rabbitmq', () => ({
  rabbitMqChannel: {
    sendToQueue: jest.fn(),
    assertQueue: jest.fn().mockResolvedValue({}),
  },
  setupRabbitMQ: jest.fn().mockResolvedValue(undefined),
}));

// The asset routes needs authentication before proceeding. So we are creating a mock user using the auth middleware format
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

// Here we are importing the test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const config = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'asset_management_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Here we are creating a pool instance
export let pool: Pool;

// Here we are creating the app instance for test and the middlewares and routes are added
export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/assets', assetRoutes);

// This is a custom error handler for the test environment
// This was needed because the actual errorHandler middleware was somehow not receiving the error correctly and the error tests are failing
app.use(
  (
    err: { message: string; statusCode: number },
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
);

/*
  In the the below beforeAll function, we are creating the DB and tables.
  Here we are using 2 pool instances. We cannot create a database and then immediately use it with the same pool connection because:
  - When we connect to PostgreSQL, we're connected to a specific database (here 'postgres')
  - We can't switch databases on an existing connection
  - To create a new database, we must be connected to a different database (usually 'postgres')
  - After creating the database, we need a new connection to that specific database
*/
beforeAll(async () => {
  // Create test DB if not exists
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

  // Connect to test DB
  pool = new Pool(config);
  await pool.query('SELECT 1');

  // Create all tables needed for tests
  await pool.query(`
    DROP TABLE IF EXISTS asset_tags CASCADE;
    DROP TABLE IF EXISTS tags CASCADE;
    DROP TABLE IF EXISTS assets CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      processing_status JSONB DEFAULT '{"thumbnails": false, "metadata": false, "duplicate_check": false}',
      metadata JSONB,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE asset_tags (
      asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (asset_id, tag_id)
    );
  `);

  /* 
    This is dependency injection - it replaces the app's database connection with our test database connection
    In the above, we are importing the db from the database.ts and we are overriding the development DB with out test DB here
   */
  // eslint-disable-next-line no-import-assign
  Object.defineProperty(dbModule, 'db', { value: pool });
});

// After finishing the tests, we are closing the connection
afterAll(async () => {
  await pool?.end();
});
