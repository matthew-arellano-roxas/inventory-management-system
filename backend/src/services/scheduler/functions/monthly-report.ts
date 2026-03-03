import { prisma } from '@root/lib/prisma';
import { resetReports } from './report-resetter';

export async function createMonthlyReport() {
  const currentDate = new Date();

  return await prisma.$transaction(async (tx) => {
    const branchReport = await tx.branchReport
      .aggregate({
        _sum: {
          revenue: true,
          profit: true,
        },
      })
      .then((b) => {
        return {
          sales: b._sum.revenue ?? 0,
          profit: b._sum.profit ?? 0,
        };
      });

    await tx.monthlyReport.create({
      data: {
        date: currentDate,
        revenue: branchReport.sales,
        profit: branchReport.profit,
      },
    });
    await resetReports(tx);
  });
}
