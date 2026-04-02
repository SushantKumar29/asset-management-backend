import logger from './logger';
import { minioClient } from '../config/minio';

export const setupMinioWithMC = async (bucketName: string) => {
  try {
    // Use MinIO JS Client to set policy
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));

    try {
      const result = await minioClient.getBucketPolicy(bucketName);
      logger.info('Policy retrieved:', result);
    } catch (error) {
      logger.info('Policy retrieval returned error (expected):', error);
    }

    return true;
  } catch (error) {
    logger.error('Failed to setup policy:', error);
    return false;
  }
};
