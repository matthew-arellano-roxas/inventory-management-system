import { logger } from '@/config';
import { TransactionBody } from '@/schemas';
import {
  createLowStockAnnouncement,
  createNegativeStockAnnouncement,
} from '@/services/announcement';
import { prisma } from '@prisma';
import {
  StockMovementReason,
  StockMovementType,
  TransactionType,
  type Product,
  type ProductReport,
  type Transaction,
} from '@root/generated/prisma/client';
import createHttpError from 'http-errors';

const LOW_STOCK_THRESHOLD = 10;

export async function createSaleTransaction(payload: TransactionBody): Promise<Transaction> {
  const productCache = new Map<number, Product>();
  let totalAmount: number = 0;
  const currentDate = new Date();

  const branch = await prisma.branch.findFirst({
    where: { id: payload.branchId },
    select: { id: true, name: true },
  });

  if (!branch) {
    throw createHttpError.NotFound('Branch not found');
  }

  return prisma.$transaction(async (tx) => {
    for (const item of payload.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId },
      });

      if (!product) {
        throw createHttpError.NotFound('Product not found');
      }

      productCache.set(item.productId, product);

      const productReport = await tx.productReport.findFirst({
        where: { productId: item.productId },
        select: { productId: true, stock: true },
      });

      if (!productReport) {
        throw createHttpError.NotFound('Product Report not found');
      }

      const productStock = getStockCount(productReport);

      const enoughStock = hasEnoughStock(productStock, item.quantity);

      if (!enoughStock) {
        throw createHttpError.BadRequest('Not enough stock');
      }

      if (hasNegativeStock(productStock)) {
        createNegativeStockAnnouncement(product.name, branch.name);
        throw createHttpError.BadRequest('Stock cannot be negative');
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: StockMovementType.OUT,
          movementReason: StockMovementReason.SALE,
          oldValue: productStock,
          newValue: productStock - item.quantity,
          createdAt: currentDate,
        },
      });

      const newStockLevel = movement.newValue;

      if (hasLowStock(newStockLevel)) {
        createLowStockAnnouncement(product.name, branch.name);
      }

      const itemTotalAmount = getItemTotalAmount(product.sellingPrice, item.quantity);
      const itemDiscountedTotalAmount = applyDiscount(itemTotalAmount, item.discount);
      totalAmount += itemDiscountedTotalAmount;
    }

    const transaction = await tx.transaction.create({
      data: {
        branchId: payload.branchId,
        type: TransactionType.SALE,
        totalAmount,
        createdAt: currentDate,
      },
    });

    for (const item of payload.items) {
      const currentItem = productCache.get(item.productId);
      if (!currentItem) {
        throw createHttpError.NotFound('Cached Product Not Found');
      }
      const itemTotalAmount = getItemTotalAmount(currentItem.sellingPrice, item.quantity);
      const totalGrossProfit =
        getGrossProfit(currentItem.costPerUnit, currentItem.sellingPrice) * item.quantity;

      // Discounted Values
      const itemTotalAmountAfterDiscount = applyDiscount(itemTotalAmount, item.discount);
      const grossProfitAfterDiscount = applyDiscount(totalGrossProfit, item.discount);

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          createdAt: currentDate,
          transactionType: TransactionType.SALE,
          price: itemTotalAmount,
        },
      });

      await tx.productReport.update({
        where: { productId: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
          revenue: {
            increment: itemTotalAmountAfterDiscount,
          },
          profit: {
            increment: grossProfitAfterDiscount,
          },
        },
      });

      await tx.branchReport.update({
        where: { branchId: payload.branchId },
        data: {
          revenue: {
            increment: itemTotalAmountAfterDiscount,
          },
          profit: {
            increment: grossProfitAfterDiscount,
          },
        },
      });
    }
    logger.info('Sale transaction created');
    return transaction;
  });
}

export function getStockCount(report: Partial<ProductReport>): number {
  return report.stock ?? 0;
}

export function hasLowStock(stock: number): boolean {
  return stock <= LOW_STOCK_THRESHOLD;
}

export function hasEnoughStock(currentQuantity: number, requestedQuantity: number): boolean {
  return currentQuantity >= requestedQuantity;
}

export function getItemTotalAmount(sellingPrice: number, quantity: number) {
  return sellingPrice * quantity;
}

export function getGrossProfit(costPerUnit: number, sellingPrice: number) {
  return sellingPrice - costPerUnit;
}

export function applyDiscount(totalAmount: number, discount: number) {
  return totalAmount - discount;
}

export function hasNegativeStock(stock: number): boolean {
  return stock < 0;
}
