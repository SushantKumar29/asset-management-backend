import { Client } from 'minio';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT!),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const setupMinio = async () => {
  try {
    const bucketExists = await minioClient.bucketExists(process.env.MINIO_BUCKET!);
    if (!bucketExists) {
      await minioClient.makeBucket(process.env.MINIO_BUCKET!);
      logger.info('✅ MinIO bucket created');
    }
  } catch (error) {
    logger.error('❌ MinIO setup failed:', error);
    throw error;
  }
};
