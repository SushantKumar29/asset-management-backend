import { Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { assetService } from '../services/assetService';
import { processSingleFileUpload } from '../helpers/fileUpload';
import { tagService } from '../services/tagService';
import { rabbitMqChannel } from '../config/rabbitmq';
import { parseTags } from '../utils/fileUtils';
import { AuthRequest } from '../types/auth';
import { CHANNEL_MESSAGES } from '../constants/channel';

export const uploadAssets = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const { description, tags } = req.body;
    const userId = req.user?.id;
    const uploadedAssets = [];
    const duplicates = [];

    for (const file of files) {
      const normalizedTags = parseTags(tags);
      const result = await processSingleFileUpload(file, userId, description, normalizedTags);

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
      data: {
        uploaded: uploadedAssets,
        duplicates: duplicates,
        message: `${uploadedAssets.length} assets uploaded${
          duplicates.length > 0 ? `, ${duplicates.length} duplicates skipped` : ''
        }`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssets = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const { status, type, search, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    const assets = await assetService.findAll(
      userId,
      status as string,
      type as string,
      search as string,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      data: {
        assets,
        pagination: {
          total: assets.length,
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

    const asset = await assetService.getFileName(id, userId);

    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    await assetService.delete(id);

    rabbitMqChannel.sendToQueue(
      CHANNEL_MESSAGES.assetProcessing,
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
