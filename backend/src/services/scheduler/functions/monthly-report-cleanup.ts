import { prisma } from '@root/lib/prisma';
import { subMonths } from 'date-fns';

export interface MonthlyReportCleanupResult {
  found: number;
  deleted: number;
}

export async function cleanupOldMonthlyReports(
  retentionMonths = 12,
): Promise<MonthlyReportCleanupResult> {
  const cutoffDate = subMonths(new Date(), retentionMonths);

  const found = await prisma.monthlyReport.count({
    where: {
      date: { lt: cutoffDate },
    },
  });

  if (found === 0) {
    return { found: 0, deleted: 0 };
  }

  const { count: deleted } = await prisma.monthlyReport.deleteMany({
    where: {
      date: { lt: cutoffDate },
    },
  });

  return { found, deleted };
}
