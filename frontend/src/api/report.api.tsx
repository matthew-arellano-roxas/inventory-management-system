// @/api/report.api.ts
import { api } from "@/config/axios";
import { cleanQuery } from "@/helpers/cleanQuery";
import {
  type BranchFinancialReportResponse,
  type BranchReportResponse,
  type CurrentMonthReportResponse,
  type DailyReportResponse,
  type MonthlyReportResponse,
  type ProductReportQuery,
  type ProductReportResponse,
  type ProductReportSummaryResponse,
} from "@/types/api/response";
import {
  type ApiResponse,
  type PaginationMeta,
} from "@/types/api/shared/api-response";

export const getCurrentMonthData = async () => {
  // We remove the .catch here so the Router can handle the error via errorElement
  const response = await api.get<ApiResponse<CurrentMonthReportResponse>>(
    "/api/report/current-month",
  );
  return response.data.data;
};

export const getCurrentDayData = async (branchId?: number) => {
  const response = await api.get<ApiResponse<CurrentMonthReportResponse>>(
    "/api/report/current-day",
    {
      params: branchId ? { branchId } : undefined,
    },
  );
  return response.data.data;
};

export const getMonthlyReport = async () => {
  // We remove the .catch here so the Router can handle the error via errorElement
  const response = await api.get<ApiResponse<MonthlyReportResponse[]>>(
    "/api/report/monthly",
  );
  return response.data.data;
};

export const getDailyReport = async (branchId?: number) => {
  const response = await api.get<ApiResponse<DailyReportResponse[]>>(
    "/api/report/daily",
    {
      params: branchId ? { branchId } : undefined,
    },
  );
  return response.data.data;
};

export const getBranchReport = async () => {
  // We remove the .catch here so the Router can handle the error via errorElement
  const response =
    await api.get<ApiResponse<BranchReportResponse[]>>("/api/report/branch");
  return response.data.data;
};

export const getFinancialReportList = async () => {
  const response = await api.get<ApiResponse<BranchFinancialReportResponse[]>>(
    "/api/report/branch-list",
  );
  return response.data.data;
};

export const getFinancialReportByBranchId = async (branchId: number) => {
  const response = await api.get<ApiResponse<BranchFinancialReportResponse>>(
    `/api/report/branch/${branchId}`,
  );
  return response.data.data;
};

export const getProductReport = async (query?: ProductReportQuery) => {
  const response = await api.get<ApiResponse<ProductReportResponse[]>>(
    "/api/report/product",
    {
      params: query ? cleanQuery(query) : undefined,
    },
  );
  return response.data.data;
};

export const getProductReportSummary = async (query?: ProductReportQuery) => {
  const response = await api.get<ApiResponse<ProductReportSummaryResponse>>(
    "/api/report/product-summary",
    {
      params: query ? cleanQuery(query) : undefined,
    },
  );
  return response.data.data;
};

export type ProductReportPageResult = {
  items: ProductReportResponse[];
  meta?: PaginationMeta;
};

export const getProductReportPage = async (query?: ProductReportQuery) => {
  const response = await api.get<
    ApiResponse<ProductReportResponse[], PaginationMeta>
  >("/api/report/product", {
    params: query ? cleanQuery(query) : undefined,
  });

  return {
    items: response.data.data ?? [],
    meta: response.data.meta,
  } satisfies ProductReportPageResult;
};

export const getProductReportById = async (id: number) => {
  // We remove the .catch here so the Router can handle the error via errorElement
  const response = await api.get<ApiResponse<ProductReportResponse>>(
    `/api/report/product/${id}`,
  );
  return response.data.data;
};

export type InventoryExportFormat = "excel" | "pdf";

export const downloadInventoryExport = async (
  format: InventoryExportFormat,
  query?: ProductReportQuery,
  timezone?: string,
) => {
  const response = await api.get<Blob>("/api/report/inventory-export", {
    params: cleanQuery({
      ...(query ?? {}),
      format,
      timezone,
    }),
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"];
  const match =
    typeof disposition === "string"
      ? /filename="?([^"]+)"?/i.exec(disposition)
      : null;

  return {
    blob: response.data,
    fileName: match?.[1] ?? `${new Date().toISOString().slice(0, 19).replace(/:/g, "-").replace("T", "_")}_report.${format === "pdf" ? "pdf" : "xls"}`,
  };
};
