import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import assetRoutes from './routes/assetRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setupDatabase } from './config/database';
import { setupRabbitMQ } from './config/rabbitmq';
import { minioClient } from './config/minio';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/assets', assetRoutes);

// This is used to checks the service health and used in the docker compose
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'asset' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await setupDatabase(); // This initializes the database
    await setupRabbitMQ(); // This initializes the rabbitmq connection for queuing

    // If the bucket does n't exist, then create th bucket
    const bucketExists = await minioClient.bucketExists(process.env.MINIO_BUCKET!);
    if (!bucketExists) {
      await minioClient.makeBucket(process.env.MINIO_BUCKET!);
    }

    app.listen(port, () => {
      logger.info(`✅ Asset service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start asset service:', error);
    process.exit(1);
  }
};

startServer();
