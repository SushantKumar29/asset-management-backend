import { tagService } from '../../services/tagService';
import { pool } from '../setup';

describe('TagService Integration Tests', () => {
  let userId: string;
  let assetId: string;

  beforeAll(async () => {
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name) 
       VALUES ($1, $2, $3) RETURNING id`,
      ['taguser@test.com', 'hashedpassword', 'Tag User']
    );
    userId = userResult.rows[0].id;

    const assetResult = await pool.query(
      `INSERT INTO assets (name, file_name, file_size, mime_type, path, checksum, owner_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      ['tag-test.jpg', 'tag-test.jpg', 1024, 'image/jpeg', '/path', 'tag123', userId, 'pending']
    );
    assetId = assetResult.rows[0].id;
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM asset_tags');
    await pool.query('DELETE FROM tags');
  });

  describe('findOrCreate', () => {
    it('should create a new tag', async () => {
      const tagId = await tagService.findOrCreate('newtag');
      expect(tagId).toBeDefined();

      const result = await pool.query('SELECT * FROM tags WHERE name = $1', ['newtag']);
      expect(result.rows.length).toBe(1);
    });

    it('should find existing tag', async () => {
      await pool.query('INSERT INTO tags (name) VALUES ($1)', ['existing']);
      const tagId = await tagService.findOrCreate('existing');

      const result = await pool.query('SELECT * FROM tags WHERE name = $1', ['existing']);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(tagId);
    });
  });

  describe('addTagsToAsset', () => {
    it('should add multiple tags to an asset', async () => {
      await tagService.addTagsToAsset(assetId, userId, ['tag1', 'tag2', 'tag3']);

      const tags = await pool.query('SELECT name FROM tags ORDER BY name');
      expect(tags.rows.length).toBe(3);

      const relationships = await pool.query(
        'SELECT COUNT(*) FROM asset_tags WHERE asset_id = $1',
        [assetId]
      );
      expect(Number(relationships.rows[0].count)).toBe(3);
    });

    it('should normalize tag names to lowercase', async () => {
      await tagService.addTagsToAsset(assetId, userId, ['UPPERCASE', 'MixedCase']);

      const tags = await pool.query('SELECT name FROM tags ORDER BY name');
      expect(tags.rows[0].name).toBe('mixedcase');
      expect(tags.rows[1].name).toBe('uppercase');
    });
  });

  describe('getTags', () => {
    it('should get all tags for an asset', async () => {
      await tagService.addTagsToAsset(assetId, userId, ['tagA', 'tagB']);

      const tags = await tagService.getTags(assetId, userId);
      expect(tags.length).toBe(2);
      expect(tags.map((t) => t.name)).toContain('taga');
      expect(tags.map((t) => t.name)).toContain('tagb');
    });

    it('should return empty array for asset with no tags', async () => {
      const tags = await tagService.getTags(assetId, userId);
      expect(tags).toEqual([]);
    });
  });
});
