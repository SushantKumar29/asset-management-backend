import winston from 'winston';

/*
  Basic logger file to log the events in the gateway service using winston
  It creates an instance of winston logger with the createLogger method with necessary configuration

  Result:

  In Development:
    logger.info('Info Message');
    // Goes to:
    // 1. gateway-service.log (JSON)
    // 2. Console (simple text)

    logger.error('Error Message');
    // Goes to:
    // 1. gateway-service-error.log (JSON)
    // 2. gateway-service.log (JSON)
    // 3. Console (simple text)


    In Production:
      logger.info('Info Message');
      // Goes to: gateway-service.log only (JSON)
      // No console output

      logger.error('Error Message');
      // Goes to: 
      // - gateway-service-error.log (JSON)
      // - gateway-service.log (JSON)
      // No console output
*/

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: 'gateway-service-error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'gateway-service.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
