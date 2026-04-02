import { getPublicUrl, minioClient } from '../config/minio';
import { rabbitMqChannel } from '../config/rabbitmq';
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
  const checksum = calculateChecksum(file.buffer);

  const existingAsset = await assetService.findDuplicate(checksum, userId);

  if (existingAsset) {
    return { duplicate: true, fileName: file.originalname, existingName: existingAsset.name };
  }

  const fileName = generateFileName(file.originalname);

  await minioClient.putObject(process.env.MINIO_BUCKET!, fileName, file.buffer, file.size, {
    'Content-Type': file.mimetype,
    'X-Amz-Meta-Checksum': checksum,
    'X-Amz-Acl': 'public-read', // Set public read access for metadata (not all MinIO versions support this)
  });

  // Generate public URL
  const publicUrl = getPublicUrl(fileName);

  const metadata = {
    fileType: getFileType(file.mimetype),
    originalName: file.originalname,
    uploadedAt: new Date().toISOString(),
  };

  const asset = await assetService.create({
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

  if (tags && tags.length > 0) {
    try {
      await tagService.addTagsToAsset(asset.id, userId, tags);
    } catch (error) {
      logger.error('Error adding tags:', error);
    }
  }

  // Send to RabbitMQ for processing
  if (rabbitMqChannel) {
    rabbitMqChannel.sendToQueue(
      'asset_processing',
      Buffer.from(
        JSON.stringify({
          assetId: asset.id,
          action: 'process',
          filePath: fileName,
          mimeType: file.mimetype,
          checksum: checksum,
          fileSize: file.size,
          userId: userId,
        })
      )
    );
  }

  return {
    duplicate: false,
    asset,
  };
};
