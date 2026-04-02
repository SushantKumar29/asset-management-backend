import { usageService } from '../../services/usageService';
import { pool } from '../setup';

describe('UsageService Integration Tests', () => {
  let userId: string;
  let assetId: string;
  let assetCounter = 0;

  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['usagetest@test.com', 'password', 'Usage User']
    );
    return result.rows[0].id;
  };

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

  const createTestUsage = async (
    assetId: string,
    userId: string,
    action: string,
    overrides: object = {}
  ) => {
    const defaultUsage = {
      assetId,
      userId,
      action,
      channel: 'web',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      metadata: {},
    };
    return await usageService.create({ ...defaultUsage, ...overrides });
  };

  beforeAll(async () => {
    userId = await createTestUser();
    assetId = await createTestAsset(userId);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM usage_logs');
  });

  describe('create', () => {
    it('should create usage log', async () => {
      await createTestUsage(assetId, userId, 'view', {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { page: 'gallery' },
      });

      const result = await pool.query('SELECT * FROM usage_logs WHERE asset_id = $1', [assetId]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].action).toBe('view');
    });
  });

  describe('getAssetUsage', () => {
    it('should get usage logs for asset', async () => {
      await createTestUsage(assetId, userId, 'view');
      await createTestUsage(assetId, userId, 'download');

      const usage = await usageService.getAssetUsage(assetId, 7);
      expect(usage.length).toBeGreaterThan(0);
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity for user', async () => {
      await createTestUsage(assetId, userId, 'view');
      await createTestUsage(assetId, userId, 'download');

      const activities = await usageService.getRecentActivity(userId, 10);
      expect(activities.length).toBe(2);
    });
  });

  describe('getUsageSummary', () => {
    it('should get usage summary', async () => {
      await createTestUsage(assetId, userId, 'view');
      await createTestUsage(assetId, userId, 'view');
      await createTestUsage(assetId, userId, 'download');

      const summary = await usageService.getUsageSummary(userId, 7);
      expect(Number(summary.total_actions)).toBe(3);
      expect(Number(summary.unique_actions)).toBe(2);
    });
  });
});
