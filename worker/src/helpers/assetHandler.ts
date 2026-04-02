// helpers/assetHandler.ts
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
import {
  AssetProcessingParams,
  DeleteAssetFilesParams,
  DuplicateCheckParams,
  ReportGenerationParams,
} from '../types/assetTypes';
import { jobService } from '../services/jobService';

const fileHandlers: Record<string, Function> = {
  image: processImage,
  video: processVideo,
  audio: processAudio,
  pdf: processPDF,
  word: processWord,
  text: processText,
};

export const processAsset = async (data: AssetProcessingParams, jobId?: string) => {
  logger.info('Starting processing for asset:', data.assetId);

  const assetId = data.assetId;
  const filePath = data.filePath;
  const mimeType = data.mimeType;
  const userId = data.userId;

  if (jobId) {
    await jobService.addLog(jobId, 'fetch', `Fetching file from storage: ${filePath}`);
  }

  try {
    const buffer = await getFileBuffer(filePath);

    if (jobId) {
      await jobService.addLog(jobId, 'process', `Processing ${mimeType} file`);
    }

    let fileResult = {};
    const fileType = getFileType(mimeType);

    if (fileType === 'document') {
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
      fileResult = await fileHandlers[fileType](buffer, assetId);
    } else {
      fileResult = await processUnknown();
    }

    const processedResult = {
      processedAt: new Date().toISOString(),
      mimeType,
      fileSize: buffer.length,
    };

    if (jobId) {
      await jobService.addLog(jobId, 'save', 'Saving processing results');
    }

    await assetService.updateAfterProcessing(assetId, ASSET_STATUS.processed, processedResult, {
      metadata: true,
      thumbnails: !!(fileResult as { thumbnails: string[] }).thumbnails,
      completed: true,
    });

    await metadataService.upsert(
      assetId,
      METADATA_KEYS.processingStatus,
      METADATA_STATUS.completed,
      { ...fileResult, ...processedResult },
      'jsonb',
      userId
    );

    logger.info('✅ Asset processed successfully:', assetId);
    if (jobId) {
      await jobService.addLog(jobId, 'complete', 'Asset processed successfully');
    }
    return { success: true, assetId };
  } catch (error) {
    logger.error('❌ Processing failed:', error);
    throw error;
  }
};

export const deleteAssetFiles = async (data: DeleteAssetFilesParams, jobId?: string) => {
  const { assetId, fileName, mimeType } = data;
  const bucket = process.env.MINIO_BUCKET!;

  if (jobId) {
    await jobService.addLog(jobId, 'delete', `Deleting file: ${fileName}`);
  }

  try {
    await minioClient.removeObject(bucket, fileName);
    logger.info(`Deleted original file: ${fileName}`);

    if (mimeType?.startsWith('image/')) {
      try {
        await deleteImageThumbnails(assetId);
        if (jobId) {
          await jobService.addLog(jobId, 'delete', 'Deleted thumbnails');
        }
      } catch (error) {
        logger.error(`Failed to delete thumbnails for asset ${assetId}:`, error);
      }
    }
  } catch (error) {
    logger.error(`Failed to delete original file ${fileName}:`, error);
    throw error;
  }

  logger.info(`✅ Successfully deleted all files for asset ${assetId}`);
  return { success: true, assetId };
};

export const generateReport = async (data: ReportGenerationParams, jobId?: string) => {
  try {
    const { userId, reportType, dateRange, trackingAction } = data;

    const { start, end } = dateRange;

    if (jobId) {
      await jobService.addLog(
        jobId,
        'fetch',
        `Generating ${reportType} report from ${start} to ${end}`
      );
    }

    let stats;
    if (reportType === 'performance') {
      stats = await reportService.getPerformanceStats(start, end);
    } else if (reportType === 'compliance') {
      stats = await reportService.getComplianceStats(start, end);
    } else {
      stats = await reportService.getUsageStats(start, end, trackingAction);
    }

    const reportData = {
      reportType,
      generatedAt: new Date().toISOString(),
      period: {
        start,
        end,
      },
      summary: stats.summary,
      details: stats.data,
      metrics: {
        totalActions: stats.summary?.total_actions || 0,
        uniqueAssets: stats.summary?.total_assets || 0,
        uniqueUsers: stats.summary?.total_users || 0,
        views: stats.summary?.total_views || 0,
        downloads: stats.summary?.total_downloads || 0,
      },
    };

    if (jobId) {
      await jobService.addLog(jobId, 'save', 'Saving report to database');
    }

    const reportId = await reportService.saveReport(userId, reportData, reportType, dateRange);

    logger.info('Report generated successfully');
    return { success: true, reportId, reportData };
  } catch (error) {
    logger.error('Report generation failed:', error);
    throw error;
  }
};

export const checkDuplicates = async (data: DuplicateCheckParams, jobId?: string) => {
  try {
    const { assetId, checksum, userId, fileName } = data;

    logger.info(`Checking duplicates for asset ${assetId} (${fileName || 'unknown file'})`);

    if (jobId) {
      await jobService.addLog(jobId, 'check', `Checking duplicates for ${fileName}`);
    }

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

    await assetService.updateDuplicateInfo(assetId, duplicateInfo);

    await assetService.updateDuplicateCheckStatus(assetId, {
      completed: true,
      found: duplicates.length,
      timestamp: new Date().toISOString(),
    });

    if (jobId) {
      await jobService.addLog(jobId, 'complete', `Found ${duplicates.length} duplicate(s)`);
    }

    if (duplicates.length > 0) {
      logger.info(`Found ${duplicates.length} duplicate(s) for asset ${assetId}`);
    }

    logger.info(`Duplicate check completed. Found ${duplicates.length} duplicates`);
    return duplicateInfo;
  } catch (error) {
    logger.error('Duplicate check failed:', error);
    throw error;
  }
};
