import { prisma } from '@root/lib/prisma';
import { subDays } from 'date-fns';

export interface DailyReportCleanupResult {
  found: number;
  deleted: number;
}

export async function cleanupOldDailyReports(
  retentionDays = 30,
): Promise<DailyReportCleanupResult> {
  const cutoffDate = subDays(new Date(), retentionDays);

  const found = await prisma.dailyReport.count({
    where: {
      date: { lt: cutoffDate },
    },
  });

  if (found === 0) {
    return { found: 0, deleted: 0 };
  }

  const { count: deleted } = await prisma.dailyReport.deleteMany({
    where: {
      date: { lt: cutoffDate },
    },
  });

  return { found, deleted };
}
