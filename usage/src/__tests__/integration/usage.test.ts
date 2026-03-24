import request from 'supertest';
import { app, pool } from '../setup';

describe('Usage Controller Integration Tests', () => {
  let userId: string;
  let assetId: string;
  let assetCounter = 0;

  // Helper function to create test user
  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['usagecontroller@test.com', 'password', 'Usage User']
    );
    return result.rows[0].id;
  };

  // Helper function to create test asset
  const createTestAsset = async (userId: string) => {
    assetCounter++;
    const result = await pool.query(
      `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        `test-${assetCounter}.jpg`,
        `test-${assetCounter}.jpg`,
        1024,
        'image/jpeg',
        '/path',
        `checksum-${assetCounter}`,
        userId,
        'pending',
      ]
    );
    return result.rows[0].id;
  };

  beforeAll(async () => {
    userId = await createTestUser();
    assetId = await createTestAsset(userId);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM usage_logs');
  });

  describe('POST /api/usage/:assetId/track', () => {
    it('should track usage', async () => {
      const response = await request(app)
        .post(`/api/usage/${assetId}`)
        .set('user-id', userId)
        .send({
          action: 'view',
          channel: 'web',
          metadata: { page: 'gallery' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/usage/:assetId', () => {
    it('should get asset usage', async () => {
      const response = await request(app)
        .get(`/api/usage/${assetId}?days=7`)
        .set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/usage/activity/recent', () => {
    it('should get recent activity', async () => {
      const response = await request(app)
        .get('/api/usage/activity/recent?limit=10')
        .set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/usage/summary', () => {
    it('should get usage summary', async () => {
      const response = await request(app)
        .get('/api/usage/summary/overview?days=7')
        .set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
