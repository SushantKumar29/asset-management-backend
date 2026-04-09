import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupDatabase } from './config/database';
import { connectRabbitMQ, rabbitMqChannel } from './config/rabbitmq';
import { handleAssetProcessing } from './helpers/messageHandler';
import jobRoutes from './routes/jobRoutes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import { CHANNEL_MESSAGES } from './constants/channels';

/*
  Main function to start the worker service.
  Here we have used the RabbitMQ for queuing the background processes.
  This worker consumes the messages from the queue and processes them.

  The objective of using queue is to create an isolated, faster, and asyncronous environment for the background processes
*/

dotenv.config();

const app = express();
const port = process.env.PORT || 3006;

app.use(helmet());
app.use(express.json());

app.use('/api/worker', jobRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'worker',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const startWorker = async (retryCount = 0) => {
  try {
    await setupDatabase();
    await connectRabbitMQ();
    logger.info('✅ Worker connected to RabbitMQ');

    rabbitMqChannel.consume(CHANNEL_MESSAGES.assetProcessing, (msg) => {
      if (!msg) return;
      handleAssetProcessing(msg, rabbitMqChannel);
    });

    logger.info('✅ Worker started consuming messages');
  } catch (error) {
    logger.error('Worker failed to start:', error);

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => startWorker(retryCount + 1), RETRY_DELAY);
    } else {
      logger.error('❌ Max retries reached, worker exiting');
      process.exit(1);
    }
  }
};

const startServer = async () => {
  try {
    app.listen(port, () => {
      logger.info(`✅ Worker API running on port ${port}`);
    });

    await startWorker();
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
