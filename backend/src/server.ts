import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({
  path: '.env',
  override: false,
});

const env = process.env.NODE_ENV || 'development';
const envFilePath = `.env.${env}`;

if (fs.existsSync(envFilePath)) {
  dotenv.config({
    path: envFilePath,
    override: false, // Docker-provided vars still take priority
  });
}
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
import { initSocketServer } from '@/config/socket';
import {
  ensureMonthlyReportsAreCurrent,
  rebuildCurrentMonthReports,
} from '@/services/report-period.service';
const app = express();
const server = http.createServer(app);

app.use(apiRateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(cors(corsOptions));
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
  const monthlyCatchup = await ensureMonthlyReportsAreCurrent();
  await rebuildCurrentMonthReports();
  if (monthlyCatchup.created > 0) {
    logger.info(
      `[Reports] Backfilled ${monthlyCatchup.created} missing monthly report(s) on startup.`,
    );
  }
  logger.info('[Reports] Rebuilt current month product and branch report totals on startup.');
  await startBackgroundJobs();
  server.listen(serverConfig.port, () => {
    logger.info(`Server running at http://localhost:${serverConfig.port}`);
  });
})();
