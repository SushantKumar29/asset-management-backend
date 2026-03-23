import { db } from '../config/database';

/*
  This is the tags service which handles the DB operations on the tags table
  This service is currently being used by the assetsController
*/

export const tagService = {
  // This function is used to find or create a tag. If the tag already exists, it returns the ID
  async findOrCreate(tagName: string) {
    const trimmedTag = tagName.toLowerCase().trim();

    let tagResult = await db.query(
      'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
      [trimmedTag]
    );

    if (tagResult.rows.length === 0) {
      tagResult = await db.query('SELECT id FROM tags WHERE name = $1', [trimmedTag]);
    }

    return tagResult.rows[0].id;
  },

  // This function is used to add a tag to an asset. If the tag already exists, it does nothing
  async addToAsset(assetId: string, tagId: string, userId: string) {
    await db.query(
      'INSERT INTO asset_tags (asset_id, tag_id, created_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [assetId, tagId, userId]
    );
  },

  // This function handles adding multiple tags to an asset,
  async addTagsToAsset(assetId: string, userId: string, tags: string | string[]) {
    const tagArray = Array.isArray(tags) ? tags : [tags];

    if (tagArray.length === 0) return;

    for (const tagName of tagArray) {
      const trimmedTag = tagName.toLowerCase().trim();
      if (trimmedTag.length === 0) continue;

      const tagId = await this.findOrCreate(trimmedTag);
      await this.addToAsset(assetId, tagId, userId);
    }
  },

  // This function is used to get all the tags for an asset
  async getTags(assetId: string, userId: string) {
    const assetCheck = await db.query('SELECT id FROM assets WHERE id = $1 AND owner_id = $2', [
      assetId,
      userId,
    ]);

    if (assetCheck.rows.length === 0) {
      return [];
    }

    const result = await db.query(
      `SELECT t.id, t.name, t.created_at, at.created_by, at.created_at as tagged_at
       FROM tags t
       JOIN asset_tags at ON t.id = at.tag_id
       WHERE at.asset_id = $1
       ORDER BY t.name`,
      [assetId]
    );

    return result.rows;
  },
};
