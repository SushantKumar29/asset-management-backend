import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setupDatabase } from './config/database';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await setupDatabase();
    app.listen(port, () => {
      logger.info(`✅ Auth service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
};

startServer();
