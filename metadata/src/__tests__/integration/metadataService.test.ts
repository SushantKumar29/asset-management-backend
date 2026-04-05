import { metadataService } from '../../services/metadataService';
import { pool } from '../setup';

describe('MetadataService Integration Tests', () => {
  let userId: string;
  let assetId: string;
  let assetCounter = 0;

  const createTestUser = async () => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id`,
      ['metadatatest@test.com', 'password', 'Metadata User']
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
        `test-${assetCounter}-${Date.now()}`,
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
    await pool.query('DELETE FROM metadata');
  });

  describe('checkAssetOwnership', () => {
    it('should return true for valid asset', async () => {
      const result = await metadataService.checkAssetOwnership(assetId, userId);
      expect(result).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should create new metadata', async () => {
      const metadata = await metadataService.upsert(
        assetId,
        'description',
        'Test image',
        { size: 'large' },
        'text',
        userId
      );

      expect(metadata).toBeDefined();
      expect(metadata.key).toBe('description');
      expect(metadata.value).toBe('Test image');
      expect(metadata.type).toBe('text');
    });

    it('should update existing metadata', async () => {
      await metadataService.upsert(assetId, 'status', 'pending', {}, 'text', userId);
      const updated = await metadataService.upsert(
        assetId,
        'status',
        'completed',
        {},
        'text',
        userId
      );

      expect(updated.value).toBe('completed');
    });
  });

  describe('findAll', () => {
    it('should fetch all metadata for an asset', async () => {
      await metadataService.upsert(assetId, 'key1', 'value1', {}, 'text', userId);
      await metadataService.upsert(assetId, 'key2', 'value2', {}, 'text', userId);

      const metadata = await metadataService.findAll(assetId);
      expect(metadata.length).toBe(2);
    });

    it('should return empty array for asset with no metadata', async () => {
      const newAssetId = await createTestAsset(userId);
      const metadata = await metadataService.findAll(newAssetId);
      expect(metadata).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete metadata by key', async () => {
      await metadataService.upsert(assetId, 'temp', 'temp value', {}, 'text', userId);
      await metadataService.delete(assetId, 'temp');

      const metadata = await metadataService.findAll(assetId);
      expect(metadata.find((m) => m.key === 'temp')).toBeUndefined();
    });
  });
});
