import request from 'supertest';
import { app, pool } from '../setup';

describe('Asset Controller Integration Tests', () => {
  let userId: string;

  // Helper function to create a test user
  const createTestUser = async (email: string = 'test@test.com', name: string = 'Asset User') => {
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name) 
       VALUES ($1, $2, $3) RETURNING id`,
      [email, 'password', name]
    );
    return userResult.rows[0].id;
  };

  // Helper function to create a test asset
  const createTestAsset = async (userId: string, assetData: object = {}) => {
    const defaultAsset = {
      name: 'test-asset.jpg',
      file_name: 'test-asset.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      path: '/path/test-asset.jpg',
      checksum: 'test123',
      owner_id: userId,
      status: 'pending',
    };

    const asset = { ...defaultAsset, ...assetData };
    const result = await pool.query(
      `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
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
    return { id: result.rows[0].id, ...asset };
  };

  // Helper function to create multiple assets (each will have uniq checksum)
  let assetCounter = 0;
  const createTestAssets = async (userId: string, count: number, baseData: object = {}) => {
    const assets = [];
    for (let i = 1; i <= count; i++) {
      assetCounter++;
      const asset = await createTestAsset(userId, {
        name: `asset-${assetCounter}.jpg`,
        file_name: `asset-${assetCounter}.jpg`,
        checksum: `checksum-${assetCounter}-${Date.now()}`,
        ...baseData,
      });
      assets.push(asset);
    }
    return assets;
  };

  // Helper function to create a tag
  const createTestTag = async (name: string) => {
    const result = await pool.query(`INSERT INTO tags (name) VALUES ($1) RETURNING id`, [name]);
    return { id: result.rows[0].id, name };
  };

  // Helper function to associate tag with asset
  const addTagToAsset = async (assetId: string, tagId: string, userId: string) => {
    await pool.query(`INSERT INTO asset_tags (asset_id, tag_id, created_by) VALUES ($1, $2, $3)`, [
      assetId,
      tagId,
      userId,
    ]);
  };

  beforeAll(async () => {
    userId = await createTestUser();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM assets');
    await pool.query('DELETE FROM asset_tags');
    await pool.query('DELETE FROM tags');
  });

  describe('GET /api/assets', () => {
    it('should get all assets for user', async () => {
      await createTestAssets(userId, 3);

      const response = await request(app).get('/api/assets').set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assets.length).toBe(3);
    });

    it('should filter assets by status', async () => {
      await createTestAssets(userId, 2, { status: 'pending' });
      await createTestAssets(userId, 1, { status: 'completed' });

      const response = await request(app).get('/api/assets?status=pending').set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.data.assets.length).toBe(2);
      expect(response.body.data.assets[0].status).toBe('pending');
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should get asset by id', async () => {
      const asset = await createTestAsset(userId, { name: 'get-test.jpg' });

      const response = await request(app).get(`/api/assets/${asset.id}`).set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('get-test.jpg');
    });

    it('should return 404 for non-existent asset', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/assets/${nonExistentId}`)
        .set('user-id', userId);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Asset not found');
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('should delete an asset', async () => {
      const asset = await createTestAsset(userId, { name: 'delete-test.jpg' });

      const response = await request(app).delete(`/api/assets/${asset.id}`).set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const result = await pool.query('SELECT * FROM assets WHERE id = $1', [asset.id]);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('GET /api/assets/:id/tags', () => {
    it('should get tags for an asset', async () => {
      const asset = await createTestAsset(userId, { name: 'tags-test.jpg' });
      const tag1 = await createTestTag('tag1');
      const tag2 = await createTestTag('tag2');

      await addTagToAsset(asset.id, tag1.id, userId);
      await addTagToAsset(asset.id, tag2.id, userId);

      const response = await request(app)
        .get(`/api/assets/${asset.id}/tags`)
        .set('user-id', userId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('POST /api/assets/upload', () => {
    it('should upload a single file', async () => {
      const response = await request(app)
        .post('/api/assets/upload')
        .set('user-id', userId)
        .attach('files', Buffer.from('test file content'), 'test.jpg')
        .field('description', 'Test upload')
        .field('tags', 'test,upload');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
