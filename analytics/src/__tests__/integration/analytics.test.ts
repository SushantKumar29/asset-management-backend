import request from 'supertest';
import { app, pool } from '../setup';

describe('Analytics Controller Integration Tests', () => {
  let userId: string;
  let assetCounter = 0;

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['analyticsctrl@test.com', 'password', 'Analytics User']
    );
    return result.rows[0].id;
  };

  // Helper function to create a test asset
  const createTestAsset = async (userId: string, overrides: object = {}) => {
    assetCounter++;
    const defaultAsset = {
      name: `test-${assetCounter}.jpg`,
      file_name: `test-${assetCounter}.jpg`,
      file_size: 1024,
      mime_type: 'image/jpeg',
      path: '/path',
      checksum: `checksum-${assetCounter}`,
      owner_id: userId,
      status: 'processed',
    };
    const asset = { ...defaultAsset, ...overrides };
    await pool.query(
      `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        asset.name,
        asset.file_name,
        asset.file_size,
        asset.mime_type,
        asset.path,
        asset.checksum,
        asset.owner_id,
        asset.status,
      ]
    );
  };

  beforeAll(async () => {
    userId = await createTestUser();
  });

  // Here we are cleaning up the tables before each test
  beforeEach(async () => {
    await pool.query('DELETE FROM usage_logs');
    await pool.query('DELETE FROM assets');
    assetCounter = 0;
  });

  describe('GET /api/analytics/summary', () => {
    it('should get asset summary', async () => {
      await createTestAsset(userId, { status: 'processed' });
      await createTestAsset(userId, { status: 'pending' });

      const response = await request(app).get('/api/analytics/summary').set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Number(response.body.data.total_assets)).toBe(2);
    });
  });

  describe('GET /api/analytics/type', () => {
    it('should get assets grouped by type', async () => {
      await createTestAsset(userId, { mime_type: 'image/jpeg' });
      await createTestAsset(userId, { mime_type: 'video/mp4' });

      const response = await request(app).get('/api/analytics/type').set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analytics/popular', () => {
    it('should get popular assets', async () => {
      const response = await request(app).get('/api/analytics/popular').set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
