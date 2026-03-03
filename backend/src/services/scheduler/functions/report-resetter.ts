import { prisma } from '@prisma';
import { Prisma } from '@root/generated/prisma/client';

export async function resetReports(tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  await client.productReport.updateMany({
    data: {
      revenue: 0,
      profit: 0,
    },
  });
  const branchIds = await client.branch
    .findMany({ select: { id: true } })
    .then((branches) => branches.map((branch) => branch.id));
  await Promise.all(
    branchIds.map(async (branchId) => {
      await client.branchReport.update({
        where: { branchId },
        data: {
          revenue: 0,
          profit: 0,
        },
      });
    }),
  );
}
