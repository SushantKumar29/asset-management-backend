import { Channel, Message } from 'amqplib';
import { processAsset, generateReport, deleteAssetFiles } from './assetHandler';
import logger from '../utils/logger';
import { jobService } from '../services/jobService';
import { CHANNEL_ACTIONS, CHANNEL_MESSAGES } from '../constants/channels';

const MAX_RETRIES = 5;
/*
  This function is used to handle the messages from the queue for asset processing
  Here we have used the RabbitMQ for queuing the background processes.
  This worker consumes the messages from the queue and processes them.

  The objective of using queue is to create an isolated, faster, and asyncronous environment for the background processes
*/

export const handleAssetProcessing = async (msg: Message, channel: Channel) => {
  const data = JSON.parse(msg.content.toString());
  let jobId: string | undefined = undefined;

  logger.info('Job received:', data.action);

  try {
    switch (data.action) {
      case CHANNEL_ACTIONS.process:
        jobId = await jobService.createJob(CHANNEL_ACTIONS.analysis, data.assetId, {
          mimeType: data.mimeType,
        });
        break;
      case CHANNEL_ACTIONS.report:
        jobId = await jobService.createJob(CHANNEL_ACTIONS.report, undefined, {
          reportType: data.reportType,
        });
        break;
      case CHANNEL_ACTIONS.delete:
        jobId = await jobService.createJob(CHANNEL_ACTIONS.delete, data.assetId);
        break;
    }

    if (jobId) {
      await jobService.startJob(jobId);
      await jobService.addLog(jobId, 'start', `Started ${data.action} job`);
    }

    switch (data.action) {
      case CHANNEL_ACTIONS.process:
        await processAsset(data, jobId);
        break;
      case CHANNEL_ACTIONS.report:
        await generateReport(data, jobId);
        break;
      case CHANNEL_ACTIONS.delete:
        await deleteAssetFiles(data, jobId);
        break;
      default:
        logger.info('Unknown action:', data.action);
    }

    if (jobId) {
      await jobService.completeJob(jobId);
      await jobService.addLog(jobId, 'complete', 'Job completed successfully');
    }

    channel.ack(msg);
    logger.info('✅ Job completed:', data.action);
  } catch (error) {
    if (jobId) {
      await jobService.failJob(jobId, String(error));
      await jobService.addLog(jobId, 'error', `Job failed: ${String(error)}`);
    }

    const retryCount = (msg.properties.headers?.retryCount || 0) + 1;

    if (retryCount >= MAX_RETRIES) {
      logger.info('Max retries reached, moving to dead letter queue');
      logger.error('❌ Job failed:', data.action, error);
      channel.reject(msg, false);
    } else {
      logger.info(`Retrying (${retryCount}/${MAX_RETRIES})...`);
      channel.publish('', CHANNEL_MESSAGES.assetProcessing, msg.content, {
        headers: { retryCount },
      });
      channel.ack(msg);
    }
  }
};
