import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analyticsRoutes';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/analytics', authenticate, analyticsRoutes);

// This is used to checks the service health and used in the docker compose
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'analytics' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    app.listen(port, () => {
      logger.info(`✅ Analytics service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start analytics service:', error);
    process.exit(1);
  }
};

startServer();
