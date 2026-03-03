import { Loader } from "@/components/Loader";
import {
  EmptyMini,
  getReportProductName,
} from "@/components/pages/inventory/inventory-page.shared";
import { InventoryPageHeader } from "@/components/pages/inventory/InventoryPageHeader";
import { useInventoryPageState } from "@/components/pages/inventory/hooks/useInventoryPageState";
import { StockMovementFeed } from "@/components/pages/StockMovementFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/helpers/formatCurrency";
import { format } from "date-fns";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  Store,
} from "lucide-react";
import { Link } from "react-router";

export const InventoryPage = () => {
  const state = useInventoryPageState();

  if (state.isInitialLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-border/60 bg-background/80 p-8 shadow-sm">
          <Loader />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-x-hidden px-3 py-4 sm:px-4 lg:px-6">
      <InventoryPageHeader
        activeBranchName={state.activeBranchName}
        filteredProductsCount={state.filteredProductsCount}
        filteredMovementsCount={state.filteredMovements.length}
        filteredOpexCount={state.filteredOpex.length}
        summary={state.summary}
        isRefreshing={state.isRefreshing}
        onRefresh={() => void state.refreshAll()}
        search={state.search}
        onSearchChange={state.setSearchAndReset}
        branches={state.branches}
        selectedBranchId={state.selectedBranchId}
        onBranchChange={state.setSelectedBranchAndReset}
        safePage={state.safePage}
        totalPages={state.totalPages}
      />

      <Card className="border-border/70 bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quick Navigation
            </p>
            <p className="text-sm text-muted-foreground">
              Jump to sections below (mobile-friendly anchor links).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="#inventory-products-section">Products</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="#stock-movements-section">Stock</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="#low-stock-section">Low Stock</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="#opex-section">OPEX</a>
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Card
          id="inventory-products-section"
          className="scroll-mt-28 min-w-0 border-border/70 bg-background shadow-sm"
        >
            <div className="border-b p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Inventory Products
                  </p>
                  <p className="text-sm text-muted-foreground">
                    One scrollable table with inventory and report values across all screen sizes.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  <PackageSearch className="mr-1 h-3.5 w-3.5" />
                  {state.filteredProductsCount} rows
                </Badge>
              </div>

              {state.filteredProductsCount > 0 && (
                <div className="mt-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {(state.safePage - 1) * state.pageSize + 1}-
                    {Math.min(state.safePage * state.pageSize, state.filteredProductsCount)} of{" "}
                    {state.filteredProductsCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={state.prevPage}
                      disabled={state.safePage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={state.nextPage}
                      disabled={state.safePage >= state.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {state.paginatedItems.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center p-6 text-center">
                <div>
                  <p className="font-semibold">No inventory records found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different search term or branch filter.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Product Table (Swipe Left/Right on smaller screens)
                  </p>
                </div>
                <div id="inventory-products-table" className="overflow-x-auto px-4 pb-4">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Product</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Gross Profit</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.paginatedItems.map((product) => {
                        const report = product.id != null ? state.reportMap.get(product.id) : undefined;
                        return (
                          <TableRow key={`${product.id ?? "x"}-${product.name}`}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  #{product.id ?? "N/A"} {product.soldBy ? `| ${product.soldBy}` : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.branchId != null
                                ? state.branchNameMap.get(product.branchId) ??
                                  `Branch #${product.branchId}`
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {product.categoryId != null
                                ? state.categoryNameMap.get(product.categoryId) ??
                                  `Category #${product.categoryId}`
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.costPerUnit)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(product.sellingPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {report
                                ? Number(report.stock).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {report ? formatCurrency(Number(report.revenue) || 0) : "N/A"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {report ? formatCurrency(Number(report.profit) || 0) : "N/A"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {product.createdAt
                                ? format(new Date(product.createdAt), "MM/dd/yy")
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {state.filteredProductsCount > 0 && (
                  <div className="border-t px-4 py-3">
                    <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                      <p className="text-sm text-muted-foreground">
                        Showing {(state.safePage - 1) * state.pageSize + 1}-
                        {Math.min(state.safePage * state.pageSize, state.filteredProductsCount)} of{" "}
                        {state.filteredProductsCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={state.prevPage}
                          disabled={state.safePage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={state.nextPage}
                          disabled={state.safePage >= state.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card
            id="low-stock-section"
            className="scroll-mt-28 min-w-0 border-border/70 bg-background shadow-sm"
          >
            <div className="border-b p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Low Stock Watch
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Products at or below 10 units from report stock.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {state.lowStockReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border bg-muted/20 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {getReportProductName(r, state.productMap)}
                    </p>
                    <p className="text-xs text-muted-foreground">#{r.productId}</p>
                  </div>
                  <Badge variant="destructive">{Number(r.stock).toFixed(2)}</Badge>
                </div>
              ))}
              {state.lowStockReports.length === 0 && (
                <EmptyMini text="No low-stock items under current filters." />
              )}
            </div>
          </Card>

          <Card
            id="opex-section"
            className="scroll-mt-28 min-w-0 border-border/70 bg-background shadow-sm"
          >
            <div className="border-b p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Store className="h-4 w-4 shrink-0 text-rose-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Operating Expenses
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recent operating expenses for the current filters ({state.filteredOpex.length} entries).
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline">{formatCurrency(state.summary.totalOpex)}</Badge>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link to="/opex">Open OPEX</Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {state.filteredOpex.slice(0, 8).map((e) => (
                <div key={e.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {state.branchNameMap.get(e.branchId) ?? `Branch #${e.branchId}`}
                      </p>
                    </div>
                    <Badge variant="outline">#{e.id}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-rose-600">
                      {formatCurrency(Number(e.amount) || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              ))}
              {state.filteredOpex.length === 0 && (
                <EmptyMini text="No expense entries matched the current filters." />
              )}
            </div>
          </Card>
        </div>

        <Card
          id="stock-movements-section"
          className="scroll-mt-28 min-w-0 border-border/70 bg-background shadow-sm"
        >
          <div className="border-b p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Stock Movements
            </p>
            <p className="text-sm text-muted-foreground">
              Feed filtered by branch and search using product-to-branch mapping.
            </p>
          </div>
          <div className="p-4">
            <StockMovementFeed movements={state.filteredMovements} />
          </div>
        </Card>
      </div>
    </div>
  );
};
