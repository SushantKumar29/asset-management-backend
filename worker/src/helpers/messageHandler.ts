import { Channel, Message } from 'amqplib';
import { processAsset, generateReport, checkDuplicates, deleteAssetFiles } from './assetHandler';
import logger from '../utils/logger';

const MAX_RETRIES = 5;
/*
  This function is used to handle the messages from the queue for asset processing
  Here we have used the RabbitMQ for queuing the background processes.
  This worker consumes the messages from the queue and processes them.

  The objective of using queue is to create an isolated, faster, and asyncronous environment for the background processes
*/

export const handleAssetProcessing = async (msg: Message, channel: Channel) => {
  const data = JSON.parse(msg.content.toString());
  logger.info('Job received:', data.action);

  try {
    switch (data.action) {
      case 'process':
        await processAsset(data);
        break;
      case 'report':
        await generateReport(data);
        break;
      case 'duplicate':
        await checkDuplicates(data);
        break;
      case 'delete':
        await deleteAssetFiles(data);
        break;
      default:
        logger.info('Unknown action:', data.action);
    }

    channel.ack(msg);
    logger.info('✅ Job completed:', data.action);
  } catch (error) {
    const retryCount = (msg.properties.headers?.retryCount || 0) + 1;

    if (retryCount >= MAX_RETRIES) {
      logger.info('Max retries reached, moving to dead letter queue');
      logger.error('❌ Job failed:', data.action, error);
      channel.reject(msg, false);
    } else {
      logger.info(`Retrying (${retryCount}/${MAX_RETRIES})...`);
      channel.publish('', 'asset_processing', msg.content, {
        headers: { retryCount },
      });
      channel.ack(msg);
    }
  }
};
