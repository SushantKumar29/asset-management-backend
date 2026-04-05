import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import gatewayRoutes from './routes/gatewayRoutes';
import swaggerRoutes from './routes/swaggerRoutes';
import { errorHandler } from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import logger from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.use('/api-docs', swaggerRoutes);

app.use('/api', gatewayRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'gateway',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  logger.info(`[Gateway] 404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`✅ API Gateway running on port ${port}`);
});
