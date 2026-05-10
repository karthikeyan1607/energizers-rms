import express from 'express';
import cors from 'cors';
import { router } from './routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
