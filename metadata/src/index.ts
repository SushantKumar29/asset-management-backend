import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import metadataRoutes from './routes/metadataRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setupDatabase } from './config/database';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/metadata', metadataRoutes);

// This is used to checks the service health and used in the docker compose
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'metadata' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await setupDatabase(); // This is used to initialize the database
    app.listen(port, () => {
      logger.info(`✅ Metadata service running on port ${port}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start metadata service:', error);
    process.exit(1);
  }
};

startServer();
