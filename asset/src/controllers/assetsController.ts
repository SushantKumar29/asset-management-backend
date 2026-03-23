import { Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { assetService } from '../services/assetService';
import { processSingleFileUpload } from '../helpers/fileUpload';
import { tagService } from '../services/tagService';
import { rabbitMqChannel } from '../config/rabbitmq';

export const uploadAsset = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const { description, tags } = req.body;
    const userId = req.user?.id;

    const result = await processSingleFileUpload(file, userId, description, tags);

    if (result.duplicate) {
      throw new AppError(`Duplicate file detected. Already exists as: ${result.existingName}`, 409);
    }

    res.status(201).json({
      success: true,
      message: 'Asset uploaded successfully',
      data: result.asset,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleAssets = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const userId = req.user?.id;
    const uploadedAssets = [];
    const duplicates = [];

    for (const file of files) {
      const result = await processSingleFileUpload(file, userId);

      if (result.duplicate) {
        duplicates.push({
          fileName: result.fileName,
          existingName: result.existingName,
        });
      } else {
        uploadedAssets.push(result.asset);
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedAssets.length} assets uploaded${
        duplicates.length > 0 ? `, ${duplicates.length} duplicates skipped` : ''
      }`,
      data: {
        uploaded: uploadedAssets,
        duplicates: duplicates,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssets = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    const [assets, total] = await Promise.all([
      assetService.findAll(userId, status as string, Number(limit), Number(offset)),
      assetService.count(userId),
    ]);

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAsset = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const asset = await assetService.findById(id, userId);

    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get asset info
    const asset = await assetService.getFileName(id, userId);

    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    // Delete from database
    await assetService.delete(id);

    // Send delete message to processing queue (THis will delete the files in the background)
    rabbitMqChannel.sendToQueue(
      'asset_processing',
      Buffer.from(
        JSON.stringify({
          assetId: id,
          action: 'delete',
          fileName: asset.file_name,
        })
      )
    );

    res.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAssetTags = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const tags = await tagService.getTags(id, userId);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};
