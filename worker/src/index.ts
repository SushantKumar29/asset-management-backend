import { connectRabbitMQ, rabbitMqChannel } from './config/rabbitmq';
import { handleAssetProcessing } from './helpers/messageHandler';
import logger from './utils/logger';

/*
  This is a main function to start the worker service.
  Here we have used the RabbitMQ for queuing the background processes.
  This worker consumes the messages from the queue and processes them.

  The objective of using queue is to create an isolated, faster, and asyncronous environment for the background processes
*/

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

export const startWorker = async (retryCount = 0) => {
  try {
    await connectRabbitMQ(); // Here we are setting up the RabbitMQ connection
    logger.info('✅ Worker connected to RabbitMQ');

    // Here we are consuming the messages from the queue for the asset processing
    rabbitMqChannel.consume('asset_processing', (msg) => {
      if (!msg) return;
      handleAssetProcessing(msg, rabbitMqChannel);
    });
  } catch (error) {
    logger.error('Worker failed to start:', error);

    // If the worker fails to start, it will retry after a certain delay till the max retries are reached
    if (retryCount < MAX_RETRIES) {
      logger.info(`=> Retrying...`);
      setTimeout(() => startWorker(retryCount + 1), RETRY_DELAY);
    } else {
      // If the max retries are reached, then the worker will exit
      logger.error('❌ Max retries reached, worker exiting');
      process.exit(1);
    }
  }
};

startWorker();
