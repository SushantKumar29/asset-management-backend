import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import assetRoutes from './routes/assetRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setupDatabase } from './config/database';
import { setupRabbitMQ } from './config/rabbitmq';
import { setupMinio } from './config/minio';
// import { minioClient } from './config/minio';
// import { setupMinioWithMC } from './utils/minioPolicyHelper';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(helmet());
app.use(express.json());

app.use('/api/assets', assetRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'asset' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await setupDatabase();
    await setupRabbitMQ();

    await setupMinio();

    // If bucket policy is not setup while creating the bucket, then setup here
    // const bucketName = process.env.MINIO_BUCKET!;
    // // If the bucket does n't exist, then create th bucket
    // const bucketExists = await minioClient.bucketExists(bucketName);
    // if (!bucketExists) {
    //   await minioClient.makeBucket(bucketName);
    //   await setupMinioWithMC(bucketName); // Setup public assess
    // }

    app.listen(port, () => {
      logger.info(`✅ Asset service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start asset service:', error);
    process.exit(1);
  }
};

startServer();
