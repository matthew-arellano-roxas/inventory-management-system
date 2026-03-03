import type { Product } from "./product.response";

export type ProductReportQuery = {
  product_details?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  productId?: number;
  branchId?: number;
};

export type ProductReportResponse = {
  id: number;
  productId: number;
  profit: number;
  revenue: number;
  stock: number;
  productName?: string;
  branchId?: number;
  product?: Product;
};

export type ProductReportSummaryResponse = {
  totalStock: number;
  lowStockCount: number;
  lowStockReports: ProductReportResponse[];
};

export type BranchReportResponse = {
  id: number;
  branchId: number;
  profit: number;
  revenue: number;
  branchName: string;
};

export type BranchFinancialReportResponse = BranchReportResponse & {
  netProfit: number;
  operationExpenses: number;
};

export type MonthlyReportResponse = {
  id: number;
  date: string;
  profit: number;
  revenue: number;
  stock: number;
};

export type DailyReportResponse = {
  id: number;
  date: string;
  profit: number;
  revenue: number;
  branchId?: number;
};

export type CurrentMonthReportResponse = {
  damage: number;
  revenue: number | null;
  profit: number | null;
};
