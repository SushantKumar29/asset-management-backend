import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from '../routes/authRoutes';
import { errorHandler } from '../middleware/errorHandler';
import * as dbModule from '../config/database';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const config = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'asset_management_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

export let pool: Pool;

export const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
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

  await pool.query(`
    DROP TABLE IF EXISTS users CASCADE;
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* 
    Dependency injection - it replaces the app's database connection with our test database connection
    In the above, we are importing the db from the database.ts and we are overriding the development DB with out test DB here
   */
  // eslint-disable-next-line no-import-assign
  Object.defineProperty(dbModule, 'db', { value: pool });
});

// After finishing the tests, we are closing the connection
afterAll(async () => {
  await pool?.end();
});

beforeEach(async () => {
  await pool?.query('DELETE FROM users');
});
