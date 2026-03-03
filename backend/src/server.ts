import dotenv from 'dotenv';
const env = process.env.NODE_ENV || 'development';
dotenv.config({
  path: `.env.${env}`,
  override: false, // Docker-provided vars take priority
});
import 'express-async-error';
import express from 'express';
import http from 'http';

import { logger, serverConfig, corsOptions, apiRateLimiter } from '@/config';
import { checkDatabaseConnection } from '@/helpers/checkdatabase';
import {
  transactionRoute,
  annoucementRoute,
  productRoute,
  branchRoute,
  categoryRoute,
  stockRoute,
  reportRoute,
  opexRoute,
} from '@/routes';

// Scheduler
import { startBackgroundJobs } from '@/services';
import { requestLogger, protectedRoute, errorHandler } from '@/middlewares';
import cors from 'cors';
import { initSocketServer } from '@/socket';
const app = express();
const server = http.createServer(app);

app.use(apiRateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(cors(corsOptions));
// Auth0 middleware
initSocketServer(server);

app.use('/api/product', protectedRoute, productRoute);
app.use('/api/branch', protectedRoute, branchRoute);
app.use('/api/category', protectedRoute, categoryRoute);
app.use('/api/stock', protectedRoute, stockRoute);
app.use('/api/transaction', protectedRoute, transactionRoute);
app.use('/api/report', protectedRoute, reportRoute);
app.use('/api/announcement', protectedRoute, annoucementRoute);
app.use('/api/expenses', protectedRoute, opexRoute);
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

app.use(errorHandler);

// Start server
(async () => {
  await checkDatabaseConnection(); // wait for DB connection
  await startBackgroundJobs();
  server.listen(serverConfig.port, () => {
    logger.info(`Server running at http://localhost:${serverConfig.port}`);
  });
})();
