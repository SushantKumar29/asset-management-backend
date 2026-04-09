import { getPublicUrl, minioClient } from '../config/minio';
import { rabbitMqChannel } from '../config/rabbitmq';
import { CHANNEL_MESSAGES } from '../constants/channel';
import { assetService } from '../services/assetService';
import { tagService } from '../services/tagService';
import { calculateChecksum, generateFileName, getFileType } from '../utils/fileUtils';
import logger from '../utils/logger';

export const processSingleFileUpload = async (
  file: Express.Multer.File,
  userId: string,
  description?: string,
  tags?: string[]
) => {
  let fileName: string | null = null;

  try {
    const checksum = calculateChecksum(file.buffer);

    const existingAsset = await assetService.findDuplicate(checksum, userId);
    if (existingAsset) {
      return { duplicate: true, fileName: file.originalname, existingName: existingAsset.name };
    }

    fileName = generateFileName(file.originalname);
    await uploadToMinIO(file, fileName, checksum);

    const asset = await createAssetRecord(file, fileName, checksum, userId, description);

    await addTagsToAsset(asset.id, userId, tags);
    await queueForProcessing(asset.id, fileName, file, checksum, userId);

    return { duplicate: false, asset };
  } catch (error) {
    // Cleanup: Remove file from MinIO if upload succeeded but later steps failed
    if (fileName) {
      await cleanupFailedUpload(fileName);
    }

    logger.error('File upload process failed:', error);
    throw new Error(
      `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

// Helper functions
const uploadToMinIO = async (file: Express.Multer.File, fileName: string, checksum: string) => {
  try {
    await minioClient.putObject(process.env.MINIO_BUCKET!, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'X-Amz-Meta-Checksum': checksum,
      'X-Amz-Acl': 'public-read',
    });
  } catch (error) {
    logger.error('MinIO upload failed:', error);
    throw new Error(
      `Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

const createAssetRecord = async (
  file: Express.Multer.File,
  fileName: string,
  checksum: string,
  userId: string,
  description?: string
) => {
  const publicUrl = getPublicUrl(fileName);
  const metadata = {
    fileType: getFileType(file.mimetype),
    originalName: file.originalname,
    uploadedAt: new Date().toISOString(),
  };

  try {
    return await assetService.create({
      name: file.originalname,
      description: description || null,
      fileName: fileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      path: publicUrl,
      checksum: checksum,
      userId: userId,
      metadata: metadata,
    });
  } catch (error) {
    logger.error('Database create failed:', error);
    throw new Error(
      `Database record creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

const addTagsToAsset = async (assetId: string, userId: string, tags?: string[]) => {
  if (!tags || tags.length === 0) return;

  try {
    await tagService.addTagsToAsset(assetId, userId, tags);
  } catch (error) {
    logger.error('Error adding tags (non-critical):', error);
    // Don't throw - tags are not critical
  }
};

const queueForProcessing = async (
  assetId: string,
  fileName: string,
  file: Express.Multer.File,
  checksum: string,
  userId: string
) => {
  if (!rabbitMqChannel) return;

  try {
    rabbitMqChannel.sendToQueue(
      CHANNEL_MESSAGES.assetProcessing,
      Buffer.from(
        JSON.stringify({
          assetId,
          action: 'process',
          filePath: fileName,
          mimeType: file.mimetype,
          checksum,
          fileSize: file.size,
          userId,
        })
      )
    );
  } catch (error) {
    logger.error('Failed to process file:', error);
    // Don't throw - processing can be retried later
  }
};

const cleanupFailedUpload = async (fileName: string) => {
  try {
    await minioClient.removeObject(process.env.MINIO_BUCKET!, fileName);
    logger.info(`Cleaned up file ${fileName} from MinIO after upload failure`);
  } catch (cleanupError) {
    logger.error('Failed to cleanup MinIO file:', cleanupError);
  }
};
