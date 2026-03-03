import { subMonths } from 'date-fns';
import { prisma } from '@prisma';
import { logger } from '@/config';

export async function cleanupStockMovements() {
  const cutoffDate = subMonths(new Date(), 1);

  // 1️⃣ Get all productIds
  const allProducts = await prisma.stockMovement.findMany({
    select: { productId: true },
    distinct: ['productId'],
  });

  const keepIds: number[] = [];

  for (const { productId } of allProducts) {
    // a) Check for recent records (< 1 month)
    const recentRecords = await prisma.stockMovement.findMany({
      where: {
        productId,
        createdAt: { gte: cutoffDate },
      },
      select: { id: true },
    });

    if (recentRecords.length > 0) {
      // keep all recent records
      keepIds.push(...recentRecords.map((r) => r.id));
    } else {
      // no recent record → keep latest old record
      const latestOld = await prisma.stockMovement.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latestOld) keepIds.push(latestOld.id);
    }
  }

  // 2️⃣ Delete old records that are not in keepIds
  const deleted = await prisma.stockMovement.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      id: { notIn: keepIds },
    },
  });

  logger.info(`[STOCK MOVEMENT CLEANUP] Deleted ${deleted.count} stock movements.`);

  return deleted;
}
