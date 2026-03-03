import { Job, Queue, Worker } from 'bullmq';
import { cleanupOldTransactions } from '@/services/scheduler/functions/transaction-cleanup';
import { cleanupStockMovements } from '@/services/scheduler/functions/stock-movement-cleanup';
import { logger } from '@/config';
import { stockLevelCheck } from './functions/stock-level-check';
import { cleanupOldAnnouncements } from './functions/notification-cleanup';
import { cleanupOldDailyReports } from './functions/daily-report-cleanup';
import { createMonthlyReport } from './functions/monthly-report';
import { createDailyReport } from './functions/daily-report';
import { createResourceCleanAnnouncement } from '../announcement/cleanup-announcement';

const QUEUE_NAME = 'system-jobs';
const TIMEZONE = 'Asia/Manila';

type SchedulerJobName = 'weekly-cleanup' | 'daily-report-and-stock-check' | 'monthly-report';

let schedulerQueue: Queue | null = null;
let schedulerWorker: Worker | null = null;
let schedulerStarted = false;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const parsedRedisUrl = new URL(redisUrl);
const connection = {
  host: parsedRedisUrl.hostname || '127.0.0.1',
  port: Number(parsedRedisUrl.port || 6379),
  username: parsedRedisUrl.username || undefined,
  password: parsedRedisUrl.password || undefined,
  maxRetriesPerRequest: null as null,
  ...(parsedRedisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};

async function runWeeklyCleanup() {
  const [transactionResult, stockMovementResult, announcementResult, dailyReportResult] =
    await Promise.all([
      cleanupOldTransactions(),
      cleanupStockMovements(),
      cleanupOldAnnouncements(),
      cleanupOldDailyReports(),
    ]);

  const removedStockMovements = stockMovementResult.count ?? 0;
  const removedTransactions = transactionResult.count ?? 0;
  const removedAnnouncements = announcementResult.deleted ?? 0;
  const removedDailyReports = dailyReportResult.deleted ?? 0;

  if (
    removedTransactions > 0 ||
    removedStockMovements > 0 ||
    removedAnnouncements > 0 ||
    removedDailyReports > 0
  ) {
    await createResourceCleanAnnouncement();
    logger.info(
      `[Scheduler] Weekly cleanup summary: transactions deleted=${removedTransactions}, stock movements deleted=${removedStockMovements}, announcements found=${announcementResult.found} deleted=${removedAnnouncements}, daily reports found=${dailyReportResult.found} deleted=${removedDailyReports}.`,
    );
    return;
  }

  logger.info(
    `[Scheduler] Weekly cleanup summary: transactions deleted=0, stock movements deleted=0, announcements found=${announcementResult.found} deleted=0, daily reports found=${dailyReportResult.found} deleted=0.`,
  );
}

async function runDailyReportAndStockCheck() {
  await createDailyReport();
  await stockLevelCheck();
  logger.info('[Scheduler] Daily report and stock check completed.');
}

async function runMonthlyReport() {
  await createMonthlyReport();
  logger.info('[Scheduler] Monthly report created and reports reset.');
}

async function processSchedulerJob(job: Job) {
  switch (job.name as SchedulerJobName) {
    case 'weekly-cleanup':
      await runWeeklyCleanup();
      return;
    case 'daily-report-and-stock-check':
      await runDailyReportAndStockCheck();
      return;
    case 'monthly-report':
      await runMonthlyReport();
      return;
    default:
      logger.warn(`[Scheduler] Unknown job received: ${job.name}`);
  }
}

async function registerRecurringJobs(queue: Queue) {
  await queue.add(
    'weekly-cleanup',
    {},
    {
      jobId: 'weekly-cleanup',
      repeat: {
        pattern: '08 03 * * *',
        tz: TIMEZONE,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );

  await queue.add(
    'daily-report-and-stock-check',
    {},
    {
      jobId: 'daily-report-and-stock-check',
      repeat: {
        pattern: '0 0 * * *',
        tz: TIMEZONE,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );

  await queue.add(
    'monthly-report',
    {},
    {
      jobId: 'monthly-report',
      repeat: {
        pattern: '0 0 1 * *',
        tz: TIMEZONE,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  );
}

export async function startBackgroundJobs() {
  if (schedulerStarted) return;

  schedulerQueue = new Queue(QUEUE_NAME, {
    connection,
  });

  schedulerWorker = new Worker(QUEUE_NAME, processSchedulerJob, {
    connection,
  });

  schedulerWorker.on('failed', (job, error) => {
    logger.error(`[BULL MQ Scheduler] Job failed: ${job?.name ?? 'unknown'} - ${error.message}`);
  });

  await registerRecurringJobs(schedulerQueue);
  schedulerStarted = true;
  logger.info('[BULL MQ Scheduler] BullMQ background jobs started.');
}
