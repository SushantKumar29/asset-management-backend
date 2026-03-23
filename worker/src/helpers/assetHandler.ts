import logger from '../utils/logger';
import { getFileBuffer } from '../utils/fileBuffer';
import {
  processImage,
  deleteImageThumbnails,
  processPDF,
  processWord,
  processVideo,
  processText,
  processUnknown,
} from './filetypes';
import { assetService } from '../services/assetService';
import { metadataService } from '../services/metadataService';
import { reportService } from '../services/reportService';
import { getFileType } from '../utils/fileUtils';
import { processAudio } from './filetypes/audioHandler';
import { ASSET_STATUS } from '../constants/assetStatus';
import { METADATA_KEYS, METADATA_STATUS } from '../constants/metadataStatus';
import { minioClient } from '../config/minio';

const fileHandlers: Record<string, Function> = {
  image: processImage,
  video: processVideo,
  audio: processAudio,
  pdf: processPDF,
  word: processWord,
  text: processText,
};

// This function is used for processing assets
export const processAsset = async (data: {
  assetId: string;
  filePath: string;
  mimeType: string;
  userId: string;
  checksum: string;
}) => {
  logger.info('Starting processing for asset:', data.assetId);

  const assetId = data.assetId;
  const filePath = data.filePath;
  const mimeType = data.mimeType;
  const userId = data.userId;

  try {
    const buffer = await getFileBuffer(filePath); // Here we are getting the file as buffer for further processing

    let fileResult = {};
    const fileType = getFileType(mimeType); // Here we are getting file type

    if (fileType === 'document') {
      // Here we are handling various document types
      if (mimeType === 'application/pdf') {
        fileResult = await processPDF(buffer, assetId);
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        fileResult = await processWord(buffer, assetId);
      } else if (mimeType.startsWith('text/')) {
        fileResult = await processText(buffer, assetId);
      } else {
        fileResult = await processUnknown();
      }
    } else if (fileHandlers[fileType]) {
      // Here we are mapping for image, video, audio
      fileResult = await fileHandlers[fileType](buffer, assetId);
    } else {
      fileResult = await processUnknown();
    }

    // Here we are creating the results for the assets table
    const processedResult = {
      processedAt: new Date().toISOString(),
      mimeType,
      fileSize: buffer.length,
    };

    // Here we are updating assets table
    await assetService.updateAfterProcessing(assetId, ASSET_STATUS.processed, processedResult, {
      metadata: true,
      thumbnails: !!(fileResult as { thumbnails: string[] }).thumbnails,
      completed: true,
    });

    // Here we are updating metadata table
    await metadataService.upsert(
      assetId,
      METADATA_KEYS.processingStatus,
      METADATA_STATUS.completed,
      { ...fileResult, ...processedResult }, // Here the extracted metadata and the processed result are merged and stored in the metadata table
      'jsonb',
      userId
    );

    logger.info('✅ Asset processed successfully:', assetId);
    return { success: true, assetId };
  } catch (error) {
    logger.error('❌ Processing failed:', error);

    // If the processing fails, update the assets table with failure status including the error
    await assetService.updateOnFailure(assetId, error);

    // If the processing fails, update the metadata table with failure status including the error
    await metadataService.upsert(
      assetId,
      METADATA_KEYS.processingStatus,
      METADATA_STATUS.failed,
      { error: String(error), failedAt: new Date().toISOString() },
      'jsonb',
      userId
    );

    throw error;
  }
};

export const deleteAssetFiles = async (data: {
  assetId: string;
  fileName: string;
  mimeType?: string;
}) => {
  const { assetId, fileName, mimeType } = data;
  const bucket = process.env.MINIO_BUCKET!;

  try {
    // Here we are deleting the original file from MinIO
    await minioClient.removeObject(bucket, fileName);
    // If the file is an image type, then we need to delete it's thumbnails also
    logger.info(`Deleted original file: ${fileName}`);
    if (mimeType?.startsWith('image/')) {
      try {
        await deleteImageThumbnails(assetId);
      } catch (error) {
        logger.error(`Failed to delete thumbnails for asset ${assetId}:`, error);
      }
    }
  } catch (error) {
    logger.error(`Failed to delete original file ${fileName}:`, error);
  }

  logger.info(`✅ Successfully deleted all files for asset ${assetId}`);
  return { success: true, assetId };
};

// This function is used for generating reports for usage
export const generateReport = async (data: {
  userId: string;
  dateRange: { start: Date; end: Date };
  trackingAction?: string; // Optional action filter for usage reports ('view', 'download', etc.)
}) => {
  try {
    const { userId, dateRange, trackingAction } = data;

    let reportData = {};

    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Pass the action parameter if provided
    const rows = await reportService.getUsageStats(startDate, trackingAction);

    reportData = {
      usage: rows.data, // rows.data contains the actual stats
      summary: {
        action: rows.trackingAction,
        period: {
          start: startDate,
          end: new Date(),
        },
      },
    };

    logger.info('Report generated successfully');

    // Here we are saving the report in the reports table which can be further downloaded
    const reportId = await reportService.saveReport(userId, reportData, dateRange);

    return {
      success: true,
      reportId,
    };
  } catch (error) {
    logger.error('Report generation failed:', error);
    throw error;
  }
};

// This function is used for checking duplicates for Bulk uploads or synching assets
export const checkDuplicates = async (data: {
  assetId: string;
  checksum: string;
  userId: string;
  fileName?: string;
}) => {
  try {
    const { assetId, checksum, userId, fileName } = data;

    logger.info(`Checking duplicates for asset ${assetId} (${fileName || 'unknown file'})`);

    // Find other assets with same checksum
    const duplicates = await assetService.findDuplicates(checksum, assetId, userId);

    const duplicateInfo = {
      isDuplicate: duplicates.length > 0,
      count: duplicates.length,
      duplicates: duplicates.map((row) => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
      })),
    };

    // Update asset metadata with duplicate info
    await assetService.updateDuplicateInfo(assetId, duplicateInfo);

    // Update processing status
    await assetService.updateDuplicateCheckStatus(assetId, {
      completed: true,
      found: duplicates.length,
      timestamp: new Date().toISOString(),
    });

    if (duplicates.length > 0) {
      logger.info(`Found ${duplicates.length} duplicate(s) for asset ${assetId}`);
    }

    logger.info(`Duplicate check completed. Found ${duplicates.length} duplicates`);
    return duplicateInfo;
  } catch (error) {
    logger.error('Duplicate check failed:', error);

    await assetService.updateDuplicateCheckStatus(data.assetId, {
      completed: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
};
