import { minioClient } from '../config/minio';
import { rabbitMqChannel } from '../config/rabbitmq';
import { assetService } from '../services/assetService';
import { tagService } from '../services/tagService';
import { calculateChecksum, generateFileName, getFileType } from '../utils/fileUtils';
import logger from '../utils/logger';

/*
  This is a helper function to upload the file and start the asset processing
  1. This function takes the file, user id, description and tags as parameters
  2. Then it checks for duplicates using the checksum and returns if it is a duplicate
  3. If it is not a duplicate it creates the asset in the database using the assetService
  4. If tags are provided, then it creates the tags and associate them with the asset in the database using the tagService
  5. After that it sends the file into the queue for processing
*/

export const processSingleFileUpload = async (
  file: Express.Multer.File,
  userId: string,
  description?: string,
  tags?: string[]
) => {
  // Calculate checksum for duplicate detection
  const checksum = calculateChecksum(file.buffer);

  // Check for duplicate by comparing the checksums
  const existingAsset = await assetService.findDuplicate(checksum, userId);

  if (existingAsset) {
    return { duplicate: true, fileName: file.originalname, existingName: existingAsset.name };
  }

  // Generate unique filename
  const fileName = generateFileName(file.originalname);

  // Upload to MinIO
  await minioClient.putObject(process.env.MINIO_BUCKET!, fileName, file.buffer, file.size, {
    'Content-Type': file.mimetype,
    'X-Amz-Meta-Checksum': checksum,
  });

  const filePath = `/${process.env.MINIO_BUCKET}/${fileName}`;

  // Prepare metadata
  const metadata = {
    fileType: getFileType(file.mimetype),
    originalName: file.originalname,
    uploadedAt: new Date().toISOString(),
  };

  // Save to database using service
  const asset = await assetService.create({
    name: file.originalname,
    description: description || null,
    fileName: fileName,
    fileSize: file.size,
    mimeType: file.mimetype,
    path: filePath,
    checksum: checksum,
    userId: userId,
    metadata: metadata,
  });

  // Handle tags if provided
  if (tags && tags.length > 0) {
    try {
      await tagService.addTagsToAsset(asset.id, userId, tags);
    } catch (error) {
      logger.error('Error adding tags:', error);
      // Fail silently - Because throwing errors here will fail the file processing
    }
  }

  // Send to queue for processing
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

  return {
    duplicate: false,
    asset,
  };
};
