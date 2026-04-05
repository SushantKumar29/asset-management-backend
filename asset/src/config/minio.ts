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

const publicBucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${process.env.MINIO_BUCKET}/*`],
    },
  ],
};

export const setupMinio = async () => {
  try {
    const bucketName = process.env.MINIO_BUCKET!;
    const bucketExists = await minioClient.bucketExists(bucketName);

    if (!bucketExists) {
      await minioClient.makeBucket(bucketName);
      logger.info('✅ MinIO bucket created');
    }

    const policyString = JSON.stringify(publicBucketPolicy);
    await minioClient.setBucketPolicy(bucketName, policyString);
  } catch (error) {
    logger.error('❌ MinIO setup failed:', error);
    throw error;
  }
};

export const getPublicUrl = (objectName: string): string => {
  // For MinIO running in Docker, we need to use the host's localhost
  const protocol = 'http';
  // Use localhost for browser access, but minio for internal service communication
  const endpoint = 'localhost';
  const port = '9000';
  const bucket = process.env.MINIO_BUCKET;

  return `${protocol}://${endpoint}:${port}/${bucket}/${objectName}`;
};
