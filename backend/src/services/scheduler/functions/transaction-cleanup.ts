import { logger } from '@/config';
import { prisma } from '@root/lib/prisma';
import { subYears } from 'date-fns';

export async function cleanupOldTransactions() {
  const cutoffDate = subYears(new Date(), 1);

  // Dry run: see what would be deleted (optional)
  const oldCount = await prisma.transaction.count({
    where: { createdAt: { lt: cutoffDate } },
  });

  logger.info(`[TRANSACTION CLEANUP] Found ${oldCount} transactions older than 1 year.`);

  if (oldCount === 0) return { count: 0 };

  // Delete old transactions (cascade deletes items automatically)
  const deleted = await prisma.transaction.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });

  logger.info(`[Cleanup] Deleted ${deleted.count} transactions (and associated items).`);

  return deleted;
}
