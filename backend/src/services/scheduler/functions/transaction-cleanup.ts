import { prisma } from '@root/lib/prisma';
import { subMonths } from 'date-fns';

export async function cleanupOldTransactions() {
  const cutoffDate = subMonths(new Date(), 3);

  const oldCount = await prisma.transaction.count({
    where: { createdAt: { lt: cutoffDate } },
  });

  if (oldCount === 0) return { count: 0 };

  return prisma.transaction.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
}
