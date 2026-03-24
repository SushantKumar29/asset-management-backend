import { assetService } from '../../services/assetService';
import { pool } from '../setup';

describe('AssetService Integration Tests', () => {
  let userId: string;
  let assetCounter = 0;

  // Helper function to create a test user
  const createTestUser = async (
    email: string = 'assetuser@test.com',
    name: string = 'Asset User'
  ) => {
    const result = await pool.query(
      `INSERT INTO users (email, password, name) 
       VALUES ($1, $2, $3) RETURNING id`,
      [email, 'password', name]
    );
    return result.rows[0].id;
  };

  // Helper function to create a test asset with customizable data
  const createTestAsset = async (userId: string, overrides: object = {}) => {
    const defaultAsset = {
      name: 'test-file.jpg',
      description: 'Test image',
      fileName: 'unique-123.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      path: '/bucket/unique-123.jpg',
      checksum: `abc123-${Date.now()}-${Math.random()}`,
      userId: userId,
      metadata: { fileType: 'image' },
      status: 'pending',
    };

    const assetData = { ...defaultAsset, ...overrides };
    return await assetService.create(assetData);
  };

  // Helper function to create multiple test assets
  const createTestAssets = async (userId: string, count: number, overrides: object = {}) => {
    const assets = [];
    for (let i = 1; i <= count; i++) {
      assetCounter++;
      const asset = await createTestAsset(userId, {
        name: `asset-${assetCounter}.jpg`,
        fileName: `asset-${assetCounter}.jpg`,
        checksum: `checksum-${assetCounter}-${Date.now()}`,
        ...overrides,
      });
      assets.push(asset);
    }
    return assets;
  };

  beforeAll(async () => {
    userId = await createTestUser();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM assets');
    assetCounter = 0;
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const asset = await createTestAsset(userId);

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('test-file.jpg');

      const result = await pool.query('SELECT * FROM assets WHERE id = $1', [asset.id]);
      expect(result.rows[0].name).toBe('test-file.jpg');
    });

    it('should create asset with custom data', async () => {
      const customAsset = await createTestAsset(userId, {
        name: 'custom.jpg',
        checksum: 'custom123',
        fileSize: 2048,
        description: 'Custom description',
      });

      expect(customAsset.name).toBe('custom.jpg');
      expect(customAsset.checksum).toBe('custom123');
      expect(customAsset.description).toBe('Custom description');

      // Verify fileSize in database
      const result = await pool.query('SELECT file_size FROM assets WHERE id = $1', [
        customAsset.id,
      ]);
      expect(result.rows[0].file_size).toBe(2048);
    });
  });

  describe('findDuplicate', () => {
    it('should find duplicate asset by checksum', async () => {
      await createTestAsset(userId, {
        checksum: 'dup123',
        name: 'duplicate.jpg',
      });

      const duplicate = await assetService.findDuplicate('dup123', userId);
      expect(duplicate).toBeDefined();
      expect(duplicate.name).toBe('duplicate.jpg');
    });

    it('should return undefined for non-existent checksum', async () => {
      const duplicate = await assetService.findDuplicate('nonexistent', userId);
      expect(duplicate).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find asset by id', async () => {
      const created = await createTestAsset(userId, {
        name: 'find-test.jpg',
        checksum: 'find123',
      });

      const asset = await assetService.findById(created.id, userId);
      expect(asset).toBeDefined();
      expect(asset.id).toBe(created.id);
      expect(asset.name).toBe('find-test.jpg');
    });

    it('should return undefined for non-existent id', async () => {
      const asset = await assetService.findById('00000000-0000-0000-0000-000000000000', userId);
      expect(asset).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should fetch all assets for a user', async () => {
      await createTestAssets(userId, 3);

      const assets = await assetService.findAll(userId);
      expect(assets.length).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete an asset', async () => {
      const asset = await createTestAsset(userId, {
        name: 'delete-test.jpg',
        checksum: 'delete123',
      });

      await assetService.delete(asset.id);

      const result = await pool.query('SELECT * FROM assets WHERE id = $1', [asset.id]);
      expect(result.rows.length).toBe(0);
    });
  });
});
