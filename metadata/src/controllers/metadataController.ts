import { Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { cache } from '../utils/cache';
import { metadataService } from '../services/metadataService';

export const setMetadata = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { assetId } = req.params;
    const { key = 'processing_status', value = 'completed', data = {}, type = 'text' } = req.body;
    const userId = req.user?.id;

    // Check asset ownership
    const hasAsset = await metadataService.checkAssetOwnership(assetId, userId);
    if (!hasAsset) {
      throw new AppError('Asset not found', 404);
    }

    const metadata = await metadataService.upsert(assetId, key, value, data, type, userId);

    // Clear cache
    await cache.clear(cache.key.metadata(userId, assetId));

    res.json({
      success: true,
      message: 'Metadata saved',
      data: {
        id: metadata.id,
        asset_id: metadata.asset_id,
        key: metadata.key,
        value: metadata.value,
        data: metadata.data,
        type: metadata.type,
        created_by: metadata.created_by,
        created_at: metadata.created_at,
        updated_at: metadata.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMetadata = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { assetId } = req.params;
    const userId = req.user?.id;

    const cacheKey = cache.key.metadata(userId, assetId);
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        fromCache: true,
      });
    }

    const hasAsset = await metadataService.checkAssetOwnership(assetId, userId);
    if (!hasAsset) {
      throw new AppError('Asset not found', 404);
    }

    const metadata = await metadataService.findAll(assetId);

    await cache.set(cacheKey, metadata, 300);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMetadata = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { assetId, key } = req.params;
    const userId = req.user?.id;

    const hasAsset = await metadataService.checkAssetOwnership(assetId, userId);
    if (!hasAsset) {
      throw new AppError('Asset not found', 404);
    }

    const deleted = await metadataService.delete(assetId, key);

    res.json({
      success: true,
      message: 'Metadata deleted',
      data: { deleted_id: deleted.id },
    });
  } catch (error) {
    next(error);
  }
};
