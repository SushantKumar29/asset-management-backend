import sharp from 'sharp';
import { minioClient } from '../../config/minio';
import logger from '../../utils/logger';

/*
  This function is used to process the image using sharp
  sharp - is a third party library which can
  - Extract metadata from the image
  - Resize the image (used for thumbnails generation)
*/

export const processImage = async (buffer: Buffer, assetId: string) => {
  logger.info('Processing image for asset:', assetId);

  const results: { metadata?: unknown; thumbnails?: string[] } = {};

  const metadata = await sharp(buffer).metadata();
  results.metadata = {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    density: metadata.density,
    size: buffer.length,
  };

  const sizes = [100, 300, 600]; // Define the sizes for thumbnails
  results.thumbnails = [];

  for (const size of sizes) {
    const thumbnailBuffer = await sharp(buffer)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailKey = `thumbnails/${assetId}/thumbnail-${size}.jpg`;
    // Upload thumbnail it to MinIO
    await minioClient.putObject(
      process.env.MINIO_BUCKET!,
      thumbnailKey,
      thumbnailBuffer,
      thumbnailBuffer.length,
      { 'Content-Type': 'image/jpeg' }
    );

    results.thumbnails.push(thumbnailKey);
  }

  return results;
};

export const deleteImageThumbnails = async (assetId: string) => {
  const bucket = process.env.MINIO_BUCKET!;
  const thumbnailsPrefix = `thumbnails/${assetId}/`;

  const objectsList = minioClient.listObjects(bucket, thumbnailsPrefix, true);
  const objectsToDelete: string[] = [];

  for await (const obj of objectsList) {
    if (obj.name) {
      objectsToDelete.push(obj.name);
    }
  }

  if (objectsToDelete.length > 0) {
    await minioClient.removeObjects(bucket, objectsToDelete);
    logger.info(`Deleted ${objectsToDelete.length} thumbnails for asset ${assetId}`);
  } else {
    logger.info(`No thumbnails found for asset ${assetId}`);
  }
};
