import { analyticsService } from '../../services/analyticsService';
import { pool } from '../setup';

describe('AnalyticsService Integration Tests', () => {
  let userId: string;
  let assetCounter = 0;

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['analyticstest@test.com', 'password', 'Analytics User']
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

  // Helper function to create test usage
  const createTestUsage = async (assetId: string, userId: string) => {
    await pool.query(
      `INSERT INTO usage_logs (asset_id, user_id, action, created_at) 
       VALUES ($1, $2, 'view', NOW())`,
      [assetId, userId]
    );
  };

  beforeAll(async () => {
    userId = await createTestUser();
  });

  // Here we are  cleaning up the tables before each test
  beforeEach(async () => {
    await pool.query('DELETE FROM usage_logs');
    await pool.query('DELETE FROM assets');
    assetCounter = 0;
  });

  describe('getAssetSummary', () => {
    it('should get asset summary', async () => {
      await createTestAsset(userId, { status: 'processed' });
      await createTestAsset(userId, { status: 'pending' });
      await createTestAsset(userId, { status: 'failed' });

      const summary = await analyticsService.getAssetSummary(userId);

      expect(Number(summary.total_assets)).toBe(3);
      expect(Number(summary.processed)).toBe(1);
      expect(Number(summary.pending)).toBe(1);
      expect(Number(summary.failed)).toBe(1);
    });
  });

  describe('getAssetsByType', () => {
    it('should group assets by type', async () => {
      await createTestAsset(userId, { mime_type: 'image/jpeg' });
      await createTestAsset(userId, { mime_type: 'image/png' });
      await createTestAsset(userId, { mime_type: 'video/mp4' });
      await createTestAsset(userId, { mime_type: 'application/pdf' });

      const result = await analyticsService.getAssetsByType(userId);

      expect(Number(result.find((r) => r.type === 'image')?.count)).toBe(2);
      expect(Number(result.find((r) => r.type === 'video')?.count)).toBe(1);
      expect(Number(result.find((r) => r.type === 'document')?.count)).toBe(1);
    });
  });

  describe('getPopularAssets', () => {
    it('should get popular assets by view count', async () => {
      const asset1 = await pool.query(
        `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        ['popular1.jpg', 'popular1.jpg', 1024, 'image/jpeg', '/path', 'pop1', userId, 'processed']
      );
      const asset2 = await pool.query(
        `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        ['popular2.jpg', 'popular2.jpg', 1024, 'image/jpeg', '/path', 'pop2', userId, 'processed']
      );

      await createTestUsage(asset1.rows[0].id, userId);
      await createTestUsage(asset1.rows[0].id, userId);
      await createTestUsage(asset2.rows[0].id, userId);

      const popular = await analyticsService.getPopularAssets(userId, 10, 30);

      expect(popular[0].name).toBe('popular1.jpg');
      expect(Number(popular[0].views)).toBe(2);
    });
  });
});
