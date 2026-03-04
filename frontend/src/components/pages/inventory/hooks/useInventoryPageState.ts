import { getBranches } from "@/api/branch.api";
import { getCategories } from "@/api/category.api";
import { getOpexList } from "@/api/opex.api";
import { keys } from "@/api/query-keys";
import {
  downloadInventoryExport,
  type InventoryExportFormat,
  getFinancialReportByBranchId,
  getFinancialReportList,
  getProductReportPage,
  getProductReportSummary,
} from "@/api/report.api";
import { getStockMovementList } from "@/api/stock.api";
import {
  type InventoryProduct,
  containsSearch,
  normalizeProduct,
} from "@/components/pages/inventory/inventory-page.utils";
import type {
  ProductReportQuery,
  ProductReportResponse,
} from "@/types/api/response";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function useInventoryPageState() {
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exportFormat, setExportFormat] = useState<InventoryExportFormat | null>(
    null,
  );
  const branchIdFilter = selectedBranchId === "all" ? null : Number(selectedBranchId);
  const trimmedSearch = search.trim();

  const reportFilters: ProductReportQuery = {
    ...(branchIdFilter != null ? { branchId: branchIdFilter } : {}),
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  };

  const branchesQuery = useQuery({
    queryKey: keys.branches.all,
    queryFn: getBranches,
    staleTime: 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: keys.categories.all,
    queryFn: getCategories,
    staleTime: 60 * 1000,
  });

  const productSummaryQuery = useQuery({
    queryKey: [
      ...keys.reports.product(),
      "summary",
      { branchId: branchIdFilter ?? null, search: trimmedSearch || null },
    ],
    queryFn: () => getProductReportSummary(reportFilters),
    staleTime: 60 * 1000,
  });

  const pagedProductReportsQuery = useQuery({
    queryKey: [
      ...keys.reports.product(),
      "inventory-page",
      { page, branchId: branchIdFilter ?? null, search: trimmedSearch || null },
    ],
    queryFn: () =>
      getProductReportPage({
        page,
        product_details: true,
        ...reportFilters,
      }),
    staleTime: 60 * 1000,
  });

  const financialReportListQuery = useQuery({
    queryKey: keys.reports.branchFinancialList(),
    queryFn: getFinancialReportList,
    staleTime: 60 * 1000,
  });

  const financialReportByBranchQuery = useQuery({
    queryKey: keys.reports.branchFinancialById(branchIdFilter ?? 0),
    queryFn: () => getFinancialReportByBranchId(branchIdFilter as number),
    enabled: branchIdFilter != null,
    staleTime: 60 * 1000,
  });

  const stockMovementsQuery = useQuery({
    queryKey: ["stock-movements"],
    queryFn: getStockMovementList,
    staleTime: 30 * 1000,
  });

  const opexQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: getOpexList,
    staleTime: 60 * 1000,
  });

  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const pagedProductReports = useMemo(
    () => pagedProductReportsQuery.data?.items ?? [],
    [pagedProductReportsQuery.data],
  );
  const stockMovements = useMemo(
    () => stockMovementsQuery.data ?? [],
    [stockMovementsQuery.data],
  );
  const opexList = useMemo(() => opexQuery.data ?? [], [opexQuery.data]);
  const productSummary = productSummaryQuery.data;

  const paginatedItems = useMemo(
    () =>
      pagedProductReports
        .map((report) => normalizeProduct(report.product))
        .filter((p): p is InventoryProduct => p != null),
    [pagedProductReports],
  );

  const branchNameMap = useMemo(
    () => new Map<number, string>(branches.map((b) => [b.id, b.name])),
    [branches],
  );

  const categoryNameMap = useMemo(
    () => new Map<number, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const productMap = useMemo(() => new Map<number, InventoryProduct>(), []);

  const reportMap = useMemo(
    () => new Map<number, ProductReportResponse>(pagedProductReports.map((r) => [r.productId, r])),
    [pagedProductReports],
  );

  const filteredMovements = useMemo(
    () =>
      stockMovements.filter((m) => containsSearch(search, m.productId, m.movementReason)),
    [search, stockMovements],
  );

  const filteredOpex = useMemo(
    () =>
      opexList.filter((e) => {
        if (branchIdFilter != null && e.branchId !== branchIdFilter) return false;
        return containsSearch(search, e.id, e.name, e.branchId, e.amount);
      }),
    [branchIdFilter, opexList, search],
  );

  const currentFinancial =
    branchIdFilter != null ? financialReportByBranchQuery.data : undefined;

  const totalsFromFinancial = currentFinancial
    ? {
        totalRevenue: Number(currentFinancial.revenue) || 0,
        totalProfit: Number(currentFinancial.profit) || 0,
        totalOpex: Number(currentFinancial.operationExpenses) || 0,
        net: Number(currentFinancial.netProfit) || 0,
      }
    : (financialReportListQuery.data ?? []).reduce(
        (acc, report) => ({
          totalRevenue: acc.totalRevenue + (Number(report.revenue) || 0),
          totalProfit: acc.totalProfit + (Number(report.profit) || 0),
          totalOpex: acc.totalOpex + (Number(report.operationExpenses) || 0),
          net: acc.net + (Number(report.netProfit) || 0),
        }),
        { totalRevenue: 0, totalProfit: 0, totalOpex: 0, net: 0 },
      );

  const summary = {
    totalStock: Number(productSummary?.totalStock) || 0,
    totalRevenue: totalsFromFinancial.totalRevenue,
    totalProfit: totalsFromFinancial.totalProfit,
    totalOpex: totalsFromFinancial.totalOpex,
    net: totalsFromFinancial.net,
    lowStockCount: Number(productSummary?.lowStockCount) || 0,
  };

  const lowStockReports = productSummary?.lowStockReports ?? [];
  const products: InventoryProduct[] = [];

  const pageSize = pagedProductReportsQuery.data?.meta?.pageSize ?? 30;
  const totalPages = pagedProductReportsQuery.data?.meta?.totalPages ?? 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const filteredProductsCount = pagedProductReportsQuery.data?.meta?.totalItems ?? 0;
  const filteredProducts = paginatedItems;

  const resetPage = () => setPage(1);
  const prevPage = () => setPage((current) => Math.max(1, current - 1));
  const nextPage = () => setPage((current) => Math.min(totalPages, current + 1));

  const isRefreshing =
    branchesQuery.isFetching ||
    categoriesQuery.isFetching ||
    productSummaryQuery.isFetching ||
    pagedProductReportsQuery.isFetching ||
    financialReportListQuery.isFetching ||
    financialReportByBranchQuery.isFetching ||
    stockMovementsQuery.isFetching ||
    opexQuery.isFetching;

  const isInitialLoading =
    !branchesQuery.data &&
    !categoriesQuery.data &&
    !productSummaryQuery.data &&
    !pagedProductReportsQuery.data &&
    !financialReportListQuery.data &&
    (branchIdFilter == null || !financialReportByBranchQuery.data) &&
    !stockMovementsQuery.data &&
    !opexQuery.data &&
    (branchesQuery.isPending ||
      categoriesQuery.isPending ||
      productSummaryQuery.isPending ||
      pagedProductReportsQuery.isPending ||
      financialReportListQuery.isPending ||
      (branchIdFilter != null && financialReportByBranchQuery.isPending) ||
      stockMovementsQuery.isPending ||
      opexQuery.isPending);

  const activeBranchName =
    branchIdFilter == null
      ? "All Branches"
      : branchNameMap.get(branchIdFilter) ?? `Branch #${branchIdFilter}`;

  const setSearchAndReset = (value: string) => {
    setSearch(value);
    resetPage();
  };

  const setSelectedBranchAndReset = (value: string) => {
    setSelectedBranchId(value);
    resetPage();
  };

  const refreshAll = async () => {
    await Promise.all([
      branchesQuery.refetch(),
      categoriesQuery.refetch(),
      productSummaryQuery.refetch(),
      pagedProductReportsQuery.refetch(),
      financialReportListQuery.refetch(),
      ...(branchIdFilter != null ? [financialReportByBranchQuery.refetch()] : []),
      stockMovementsQuery.refetch(),
      opexQuery.refetch(),
    ]);
  };

  const exportInventory = async (format: InventoryExportFormat) => {
    if (exportFormat) return;

    setExportFormat(format);

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { blob, fileName } = await downloadInventoryExport(
        format,
        reportFilters,
        timeZone,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === "pdf"
          ? "Inventory PDF downloaded."
          : "Inventory Excel downloaded.",
      );
    } catch (error) {
      console.error("Inventory export failed", error);
      toast.error("Failed to export inventory.");
    } finally {
      setExportFormat(null);
    }
  };

  return {
    search,
    selectedBranchId,
    branches,
    categories,
    products,
    stockMovements,
    opexList,
    branchNameMap,
    categoryNameMap,
    productMap,
    reportMap,
    filteredProducts,
    filteredProductsCount,
    filteredMovements,
    filteredOpex,
    summary,
    lowStockReports,
    pageSize,
    page,
    setPage,
    safePage,
    totalPages,
    paginatedItems,
    resetPage,
    prevPage,
    nextPage,
    isRefreshing,
    isExporting: exportFormat != null,
    exportFormat,
    isInitialLoading,
    activeBranchName,
    setSearchAndReset,
    setSelectedBranchAndReset,
    refreshAll,
    exportInventory,
  };
}
