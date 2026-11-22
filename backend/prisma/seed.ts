import { prisma } from '../lib/prisma';
import {
  StockMovementReason,
  StockMovementType,
  TransactionType,
  Unit,
  type Unit as UnitType,
} from '../generated/prisma/enums';

const seedMarkerKey = 'demo-inventory-seed-v1';
const dayMilliseconds = 24 * 60 * 60 * 1000;
const hourMilliseconds = 60 * 60 * 1000;

type DemoProductDefinition = {
  name: string;
  categoryName: string;
  costPerUnit: number;
  sellingPrice: number;
  soldBy: UnitType;
  openingStock: number;
};

const demoBranches: { name: string; products: DemoProductDefinition[] }[] = [
  {
    name: 'Demo - Central Branch',
    products: [
      {
        name: 'Jasmine Rice (Demo)',
        categoryName: 'Demo - Pantry',
        costPerUnit: 48,
        sellingPrice: 60,
        soldBy: Unit.KG,
        openingStock: 100,
      },
      {
        name: 'Ground Coffee (Demo)',
        categoryName: 'Demo - Beverages',
        costPerUnit: 85,
        sellingPrice: 110,
        soldBy: Unit.PC,
        openingStock: 100,
      },
      {
        name: 'Bottled Water (Demo)',
        categoryName: 'Demo - Beverages',
        costPerUnit: 12,
        sellingPrice: 18,
        soldBy: Unit.PC,
        openingStock: 100,
      },
    ],
  },
  {
    name: 'Demo - North Branch',
    products: [
      {
        name: 'Cooking Oil (Demo)',
        categoryName: 'Demo - Pantry',
        costPerUnit: 95,
        sellingPrice: 125,
        soldBy: Unit.PC,
        openingStock: 100,
      },
      {
        name: 'Laundry Detergent (Demo)',
        categoryName: 'Demo - Household',
        costPerUnit: 55,
        sellingPrice: 75,
        soldBy: Unit.PC,
        openingStock: 100,
      },
      {
        name: 'Hand Soap (Demo)',
        categoryName: 'Demo - Household',
        costPerUnit: 25,
        sellingPrice: 38,
        soldBy: Unit.PC,
        openingStock: 100,
      },
    ],
  },
];

function getManilaDayStart(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to determine the current date in Asia/Manila.');
  }

  return new Date(`${year}-${month}-${day}T00:00:00+08:00`);
}

function getManilaMonthStart(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) {
    throw new Error('Unable to determine the current month in Asia/Manila.');
  }

  return new Date(`${year}-${month}-01T00:00:00+08:00`);
}

function getManilaNoon(daysAgo: number, todayStart: Date): Date {
  return new Date(todayStart.getTime() - daysAgo * dayMilliseconds + 12 * hourMilliseconds);
}

async function seedDemoData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before seeding.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    !process.argv.includes('--confirm-demo-production')
  ) {
    throw new Error('Production seeding requires the --confirm-demo-production flag.');
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const existingMarker = await tx.systemSettings.findUnique({
        where: { key: seedMarkerKey },
      });
      if (existingMarker) return false;

      const todayStart = getManilaDayStart(new Date());
      const currentMonthStart = getManilaMonthStart(new Date());

      const categoryIds = new Map<string, number>();
      for (const categoryName of new Set(
        demoBranches.flatMap((branch) => branch.products.map((product) => product.categoryName)),
      )) {
        const category = await tx.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        });
        categoryIds.set(categoryName, category.id);
      }

      const stockByProduct = new Map<number, number>();
      const currentMonthTotalsByProduct = new Map<number, { revenue: number; profit: number }>();
      const currentMonthTotalsByBranch = new Map<number, { revenue: number; profit: number }>();
      const dailyTotals = new Map<
        string,
        { branchId: number; date: Date; revenue: number; profit: number }
      >();

      for (const [branchIndex, branchDefinition] of demoBranches.entries()) {
        const existingBranch = await tx.branch.findFirst({
          where: { name: branchDefinition.name },
        });
        if (existingBranch) {
          throw new Error(
            `A branch named "${branchDefinition.name}" already exists; refusing to seed over it.`,
          );
        }
        const savedBranch = await tx.branch.create({ data: { name: branchDefinition.name } });

        await tx.branchReport.upsert({
          where: { branchId: savedBranch.id },
          update: {},
          create: { branchId: savedBranch.id },
        });

        const products: (DemoProductDefinition & {
          product: Awaited<ReturnType<typeof tx.product.create>>;
        })[] = [];
        for (const definition of branchDefinition.products) {
          const categoryId = categoryIds.get(definition.categoryName);
          if (categoryId === undefined) {
            throw new Error(`Missing seeded category "${definition.categoryName}".`);
          }

          const product = await tx.product.create({
            data: {
              branchId: savedBranch.id,
              categoryId,
              name: definition.name,
              costPerUnit: definition.costPerUnit,
              sellingPrice: definition.sellingPrice,
              soldBy: definition.soldBy,
              addedBy: 'demo-seed',
            },
          });

          await tx.productReport.create({
            data: { productId: product.id },
          });
          products.push({ ...definition, product });
        }

        const purchaseDate = getManilaNoon(75, todayStart);
        const openingTotal = products.reduce(
          (total, product) => total + product.costPerUnit * product.openingStock,
          0,
        );
        const purchase = await tx.transaction.create({
          data: {
            branchId: savedBranch.id,
            type: TransactionType.PURCHASE,
            totalAmount: openingTotal,
            createdAt: purchaseDate,
          },
        });

        for (const product of products) {
          const existingStock =
            (
              await tx.productReport.findUnique({
                where: { productId: product.product.id },
                select: { stock: true },
              })
            )?.stock ?? 0;
          const newStock = existingStock + product.openingStock;

          await tx.transactionItem.create({
            data: {
              productId: product.product.id,
              transactionId: purchase.id,
              transactionType: TransactionType.PURCHASE,
              quantity: product.openingStock,
              price: product.costPerUnit * product.openingStock,
              createdAt: purchaseDate,
            },
          });
          await tx.stockMovement.create({
            data: {
              productId: product.product.id,
              movementType: StockMovementType.IN,
              movementReason: StockMovementReason.PURCHASE,
              quantity: product.openingStock,
              oldValue: existingStock,
              newValue: newStock,
              createdAt: purchaseDate,
            },
          });
          stockByProduct.set(product.product.id, newStock);
        }

        for (const daysAgo of [65, 35, 6, 5, 4, 3, 2, 1, 0]) {
          const saleDate = getManilaNoon(daysAgo, todayStart);
          const saleItems = products.map((product, productIndex) => ({
            product,
            quantity: ((daysAgo + productIndex + branchIndex) % 3) + 1,
          }));
          const saleTotal = saleItems.reduce(
            (total, item) => total + item.product.sellingPrice * item.quantity,
            0,
          );
          const sale = await tx.transaction.create({
            data: {
              branchId: savedBranch.id,
              type: TransactionType.SALE,
              totalAmount: saleTotal,
              createdAt: saleDate,
            },
          });

          const dayStart = getManilaDayStart(saleDate);
          const dayKey = `${savedBranch.id}:${dayStart.toISOString()}`;
          const dayTotals = dailyTotals.get(dayKey) ?? {
            branchId: savedBranch.id,
            date: dayStart,
            revenue: 0,
            profit: 0,
          };

          for (const item of saleItems) {
            const productId = item.product.product.id;
            const amount = item.product.sellingPrice * item.quantity;
            const profit = amount - item.product.costPerUnit * item.quantity;
            const oldStock = stockByProduct.get(productId) ?? 0;
            const newStock = oldStock - item.quantity;
            if (newStock < 0) {
              throw new Error(`Demo sales exceed the opening stock for "${item.product.name}".`);
            }

            await tx.transactionItem.create({
              data: {
                productId,
                transactionId: sale.id,
                transactionType: TransactionType.SALE,
                quantity: item.quantity,
                price: amount,
                createdAt: saleDate,
              },
            });
            await tx.stockMovement.create({
              data: {
                productId,
                movementType: StockMovementType.OUT,
                movementReason: StockMovementReason.SALE,
                quantity: item.quantity,
                oldValue: oldStock,
                newValue: newStock,
                createdAt: saleDate,
              },
            });

            stockByProduct.set(productId, newStock);
            dayTotals.revenue += amount;
            dayTotals.profit += profit;

            if (saleDate >= currentMonthStart) {
              const productTotals = currentMonthTotalsByProduct.get(productId) ?? {
                revenue: 0,
                profit: 0,
              };
              productTotals.revenue += amount;
              productTotals.profit += profit;
              currentMonthTotalsByProduct.set(productId, productTotals);
              const branchTotals = currentMonthTotalsByBranch.get(savedBranch.id) ?? {
                revenue: 0,
                profit: 0,
              };
              branchTotals.revenue += amount;
              branchTotals.profit += profit;
              currentMonthTotalsByBranch.set(savedBranch.id, branchTotals);
            }
          }

          dailyTotals.set(dayKey, dayTotals);
        }

        for (const product of products) {
          const totals = currentMonthTotalsByProduct.get(product.product.id) ?? {
            revenue: 0,
            profit: 0,
          };
          await tx.productReport.update({
            where: { productId: product.product.id },
            data: {
              stock: stockByProduct.get(product.product.id) ?? 0,
              ...totals,
            },
          });
        }

        const branchTotals = currentMonthTotalsByBranch.get(savedBranch.id) ?? {
          revenue: 0,
          profit: 0,
        };
        await tx.branchReport.update({
          where: { branchId: savedBranch.id },
          data: branchTotals,
        });

        await tx.operatingExpense.createMany({
          data: [
            {
              branchId: savedBranch.id,
              name: 'Demo - Utilities',
              amount: 1250,
              createdAt: getManilaNoon(0, todayStart),
            },
            {
              branchId: savedBranch.id,
              name: 'Demo - Supplies',
              amount: 680,
              createdAt: getManilaNoon(0, todayStart),
            },
          ],
        });
      }

      const recentDays = Array.from(
        { length: 7 },
        (_, index) => new Date(todayStart.getTime() - index * dayMilliseconds),
      );
      for (const branchDefinition of demoBranches) {
        const branch = await tx.branch.findFirstOrThrow({
          where: { name: branchDefinition.name },
          select: { id: true },
        });

        for (const date of recentDays) {
          const totals = dailyTotals.get(`${branch.id}:${date.toISOString()}`) ?? {
            revenue: 0,
            profit: 0,
          };
          await tx.dailyReport.upsert({
            where: {
              branchId_date: {
                branchId: branch.id,
                date,
              },
            },
            update: { revenue: totals.revenue, profit: totals.profit },
            create: {
              branchId: branch.id,
              date,
              revenue: totals.revenue,
              profit: totals.profit,
            },
          });
        }
      }

      await tx.systemSettings.create({
        data: {
          key: seedMarkerKey,
          value: new Date().toISOString(),
        },
      });

      return true;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (result) {
    console.info('Demo inventory data seeded successfully.');
  } else {
    console.info('Demo inventory data already exists; no changes were made.');
  }
}

seedDemoData()
  .catch((error: unknown) => {
    console.error('Failed to seed demo inventory data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
