import { prisma } from '@root/lib/prisma';
import { subDays } from 'date-fns';

export interface CleanupResult {
  found: number;
  deleted: number;
}

/**
 * Cleans up old notifications.
 * Default retention: 90 days
 */
export async function cleanupOldAnnouncements(retentionDays = 90): Promise<CleanupResult> {
  const cutoffDate = subDays(new Date(), retentionDays);

  // 1️⃣ Dry run — count first
  const found = await prisma.announcement.count({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  if (found === 0) {
    return { found: 0, deleted: 0 };
  }

  // 2️⃣ Delete
  const { count: deleted } = await prisma.announcement.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return { found, deleted };
}
