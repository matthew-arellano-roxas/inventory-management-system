import { prisma } from '@root/lib/prisma';
import createHttpError from 'http-errors';
import { getTotalDamageAmount } from './transaction';
import { opexService } from './opex.service';
import {
  DailyReportQuery,
  BranchFinancialReport,
  ProductReportQuery,
  ProductReportSummary,
} from '@/types/report.types';
import { calculateSkip } from '@/helpers';
import { Prisma } from '@root/generated/prisma/client';
import { TransactionType } from '@root/generated/prisma/enums';
import { addDays, startOfDay } from 'date-fns';

const ITEM_LIMIT = 30;

const buildProductReportWhere = (query?: ProductReportQuery): Prisma.ProductReportWhereInput => {
  const where: Prisma.ProductReportWhereInput = {};
  const productWhere: Prisma.ProductWhereInput = {};

  if (query?.search) {
    productWhere.name = {
      contains: query.search,
      mode: 'insensitive',
    };
  }

  if (query?.productId) {
    productWhere.id = query.productId;
  }

  if (query?.branchId) {
    productWhere.branchId = query.branchId;
  }

  if (Object.keys(productWhere).length > 0) {
    where.product = productWhere;
  }

  return where;
};

// Monthly Reports
const getMonthlyReports = () => {
  return prisma.monthlyReport.findMany({
    orderBy: { date: 'desc' },
    take: 6,
  });
};

const getDailyReports = async (query?: DailyReportQuery) => {
  if (query?.branchId != null) {
    const reports = await prisma.dailyReport.findMany({
      where: { branchId: query.branchId },
      orderBy: { date: 'desc' },
      take: 7,
    });

    return reports.reverse();
  }

  const reports = await prisma.dailyReport.groupBy({
    by: ['date'],
    _sum: {
      revenue: true,
      profit: true,
    },
    orderBy: { date: 'desc' },
    take: 7,
  });

  return reports.reverse().map((report, index) => ({
    id: index + 1,
    date: report.date,
    revenue: report._sum.revenue ?? 0,
    profit: report._sum.profit ?? 0,
  }));
};

const getCurrentMonthReport = async () => {
  return prisma.branchReport
    .aggregate({
      _sum: {
        revenue: true,
        profit: true,
      },
    })
    .then(async (report) => {
      const damage = await getTotalDamageAmount();
      return { ...report._sum, damage };
    });
};

const getCurrentDayReport = async (query?: DailyReportQuery) => {
  const dayStart = startOfDay(new Date());
  const nextDayStart = addDays(dayStart, 1);

  const [transactionItems, damageAggregate] = await Promise.all([
    prisma.transactionItem.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lt: nextDayStart,
        },
        transactionType: {
          in: [TransactionType.SALE, TransactionType.RETURN],
        },
        ...(query?.branchId != null
          ? {
              transaction: {
                branchId: query.branchId,
              },
            }
          : {}),
      },
      select: {
        price: true,
        quantity: true,
        transactionType: true,
        product: {
          select: {
            costPerUnit: true,
          },
        },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: TransactionType.DAMAGE,
        createdAt: {
          gte: dayStart,
          lt: nextDayStart,
        },
        ...(query?.branchId != null ? { branchId: query.branchId } : {}),
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const totals = transactionItems.reduce(
    (acc, item) => {
      const amount = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      const costPerUnit = Number(item.product.costPerUnit) || 0;
      const grossProfit = amount - costPerUnit * quantity;
      const direction = item.transactionType === TransactionType.RETURN ? -1 : 1;

      acc.revenue += amount * direction;
      acc.profit += grossProfit * direction;

      return acc;
    },
    { revenue: 0, profit: 0 },
  );

  return {
    revenue: totals.revenue,
    profit: totals.profit,
    damage: damageAggregate._sum.totalAmount ?? 0,
  };
};

// Product Reports
const getProductReports = (query?: ProductReportQuery) => {
  const productDetails = query?.product_details;
  const where = buildProductReportWhere(query);
  const take = query?.page != null ? ITEM_LIMIT : query?.limit;
  const skip = query?.page != null ? calculateSkip(query.page, ITEM_LIMIT) : undefined;
  const orderBy: Prisma.ProductReportOrderByWithRelationInput[] =
    query?.limit != null && query.page == null
      ? [{ revenue: 'desc' }, { productId: 'asc' }]
      : [{ productId: 'asc' }];

  return prisma.productReport.findMany({
    orderBy,
    include: {
      product: productDetails ?? false,
    },
    ...(take != null ? { take } : {}),
    ...(skip != null ? { skip } : {}),
    where,
  });
};

const getProductReportCount = (query?: ProductReportQuery) => {
  return prisma.productReport.count({
    where: buildProductReportWhere(query),
  });
};

const getSummaryProductReports = (
  where: Prisma.ProductReportWhereInput,
  orderBy: Prisma.ProductReportOrderByWithRelationInput[],
) => {
  return prisma.productReport.findMany({
    where,
    orderBy,
    take: 5,
    include: {
      product: true,
    },
  });
};

const getProductReportSummary = async (
  query?: ProductReportQuery,
): Promise<ProductReportSummary> => {
  const where = buildProductReportWhere(query);
  const lowStockWhere: Prisma.ProductReportWhereInput = {
    ...where,
    stock: { lte: 10 },
  };

  const [stockAggregate, lowStockCount, lowStockReports] = await Promise.all([
    prisma.productReport.aggregate({
      where,
      _sum: {
        stock: true,
      },
    }),
    prisma.productReport.count({
      where: lowStockWhere,
    }),
    getSummaryProductReports(lowStockWhere, [{ stock: 'asc' }, { productId: 'asc' }]),
  ]);

  return {
    totalStock: Number(stockAggregate._sum.stock) || 0,
    lowStockCount,
    lowStockReports,
  };
};

const getProductReportByProductId = async (id: number) => {
  const report = await prisma.productReport.findFirst({
    where: { productId: id },
    include: {
      product: {
        select: { name: true },
      },
    },
  });

  if (!report) throw new createHttpError.NotFound('Product Report Not Found.');

  const { product, ...rest } = report;

  return {
    ...rest,
    productName: product.name,
  };
};

// Branch Reports
const getBranchReports = async () => {
  const reports = await prisma.branchReport.findMany({
    orderBy: { branchId: 'asc' },
    include: {
      branch: {
        select: { name: true },
      },
    },
  });

  return reports.map(({ branch, ...report }) => ({
    ...report,
    branchName: branch.name,
  }));
};

const getBranchReportByBranchId = async (id: number) => {
  const report = await prisma.branchReport.findFirst({
    where: { branchId: id },
    include: {
      branch: {
        select: { name: true },
      },
    },
  });

  if (!report) throw new createHttpError.NotFound('Branch Report Not Found.');

  const { branch, ...rest } = report;

  return {
    ...rest,
    branchName: branch.name,
  };
};

const getNetProfit = (profit: number, totalExpenses: number) => {
  return profit - totalExpenses;
};

export const getFinancialReportByBranchId = async (branchId: number) => {
  const reports = await reportService.getBranchReportByBranchId(branchId);
  const totalExpenses = await opexService.getTotalOpex(branchId);
  const profit = reports?.profit ?? 0;
  const netProfit = getNetProfit(profit, totalExpenses);
  const financialReport: BranchFinancialReport = {
    ...reports,
    netProfit,
    operationExpenses: totalExpenses,
  };
  return financialReport;
};

const getFinancialReportList = async () => {
  const reports = await reportService.getBranchReports();
  const financialReportList: BranchFinancialReport[] = [];
  for (const report of reports) {
    const totalExpenses = await opexService.getTotalOpex(report.branchId);
    const profit = report.profit ?? 0;
    const netProfit = getNetProfit(profit, totalExpenses);
    const financialReport: BranchFinancialReport = {
      ...report,
      netProfit,
      operationExpenses: totalExpenses,
    };
    financialReportList.push(financialReport);
  }
  return financialReportList;
};

export const reportService = {
  getMonthlyReports,
  getDailyReports,
  getCurrentDayReport,
  getCurrentMonthReport,
  getProductReports,
  getProductReportCount,
  getProductReportSummary,
  getProductReportByProductId,
  getBranchReports,
  getBranchReportByBranchId,
  getFinancialReportByBranchId,
  getFinancialReportList,
};
