import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupDatabase } from './config/database';
import usageRoutes from './routes/usageRoutes';
import reportRoutes from './routes/reportRoutes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import { setupRabbitMQ } from './config/rabbitmq';

dotenv.config();

const app = express();
const port = process.env.PORT || 3004;

app.use(helmet());
app.use(express.json());

app.use('/api/usage', usageRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'usage' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await setupDatabase();
    await setupRabbitMQ();

    app.listen(port, () => {
      logger.info(`✅ Usage service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start usage service:', error);
    process.exit(1);
  }
};

startServer();
