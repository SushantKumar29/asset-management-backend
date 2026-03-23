import winston from 'winston';

/*
  This is a basic logger file to log the events in the analytics service using winston
  It creates an instance of winston logger with the createLogger method with necessary configuration

  Result:

  In Development:
    logger.info('Info Message');
    // Goes to:
    // 1. analytics-service.log (JSON)
    // 2. Console (simple text)

    logger.error('Error Message');
    // Goes to:
    // 1. analytics-service-error.log (JSON)
    // 2. analytics-service.log (JSON)
    // 3. Console (simple text)


    In Production:
      logger.info('Info Message');
      // Goes to: analytics-service.log only (JSON)
      // No console output

      logger.error('Error Message');
      // Goes to: 
      // - analytics-service-error.log (JSON)
      // - analytics-service.log (JSON)
      // No console output
*/

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: 'analytics-service-error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'analytics-service.log' }),
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
