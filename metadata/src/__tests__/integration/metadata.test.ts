import request from 'supertest';
import { app, pool } from '../setup';

describe('Metadata Controller Integration Tests', () => {
  let userId: string;
  let assetId: string;
  let assetCounter = 0;

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['metacontroller@test.com', 'password', 'Meta User']
    );
    return result.rows[0].id;
  };

  // Helper function to create a test asset
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
        `checksum-${assetCounter}-${Date.now()}`,
        userId,
        'pending',
      ]
    );
    return result.rows[0].id;
  };

  // Helper function to create metadata
  const createTestMetadata = async (
    assetId: string,
    key: string,
    value: string,
    userId: string
  ) => {
    await pool.query(
      `INSERT INTO metadata (asset_id, key, value, created_by) VALUES ($1, $2, $3, $4)`,
      [assetId, key, value, userId]
    );
  };

  beforeAll(async () => {
    userId = await createTestUser();
    assetId = await createTestAsset(userId);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM metadata');
  });

  describe('POST /api/metadata/:assetId', () => {
    it('should create metadata', async () => {
      const response = await request(app)
        .post(`/api/metadata/${assetId}`)
        .set('user-id', userId)
        .send({
          key: 'description',
          value: 'Test image',
          data: { size: 'large' },
          type: 'text',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('description');
    });

    it('should return 404 for invalid asset', async () => {
      const response = await request(app)
        .post('/api/metadata/00000000-0000-0000-0000-000000000000')
        .set('user-id', userId)
        .send({ key: 'test', value: 'value' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/metadata/:assetId', () => {
    it('should get all metadata for asset', async () => {
      await createTestMetadata(assetId, 'key1', 'value1', userId);
      await createTestMetadata(assetId, 'key2', 'value2', userId);

      const response = await request(app).get(`/api/metadata/${assetId}`).set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it('should return empty array for asset with no metadata', async () => {
      const newAssetId = await createTestAsset(userId);
      const response = await request(app).get(`/api/metadata/${newAssetId}`).set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/metadata/:assetId/:key', () => {
    it('should delete metadata by key', async () => {
      await createTestMetadata(assetId, 'temp', 'temp value', userId);

      const response = await request(app)
        .delete(`/api/metadata/${assetId}/temp`)
        .set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const result = await pool.query('SELECT * FROM metadata WHERE asset_id = $1 AND key = $2', [
        assetId,
        'temp',
      ]);
      expect(result.rows.length).toBe(0);
    });
  });
});
