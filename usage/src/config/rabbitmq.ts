import amqp from 'amqplib';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export let rabbitMqChannel: amqp.Channel;

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/*
  This is a configuration function to configure the RabbitMQ connection in the asset service
  We have used RabbitMQ for queuing the background processes.

  The objective of using queue is to create an isolated, faster, and asyncronous environment for the background processes

  We have used RabbitMQ Tool for message queueing which is widely used. 
  It has the following features:  
  - Rich routing capabilities
  - Multiple protocol support: AMQP, MQTT, STOMP, HTTP 
  - Built-in monitoring and control
  - Good documentation and Extensive community resources

  Here, AMQP is used which is:
  - Advanced Message Queuing Protocol
  - This protocol allows applications to communicate asynchronously

  amqplib is the Node.js library that implements AMQP
*/

export const setupRabbitMQ = async (retryCount = 0): Promise<void> => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    rabbitMqChannel = await connection.createChannel();
    await rabbitMqChannel.assertQueue('asset_processing');
    logger.info('✅ Connected to RabbitMQ');
  } catch (error) {
    logger.error(
      `❌ Failed to connect to RabbitMQ (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
      error
    );

    if (retryCount < MAX_RETRIES - 1) {
      logger.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return setupRabbitMQ(retryCount + 1);
    } else {
      logger.error('RabbitMQ connection failed.');
      throw error;
    }
  }
};
