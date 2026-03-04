import { ReusableSelect } from "@/components/ReusableSelect";
import { SummaryPill } from "@/components/pages/inventory/inventory-page.shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/helpers/formatCurrency";
import type { BranchResponse } from "@/types/api/response";
import { Download, RefreshCw, Search, Warehouse } from "lucide-react";

type InventoryPageHeaderProps = {
  activeBranchName: string;
  filteredProductsCount: number;
  filteredMovementsCount: number;
  filteredOpexCount: number;
  summary: {
    totalStock: number;
    lowStockCount: number;
    totalRevenue: number;
    totalProfit: number;
    totalOpex: number;
    net: number;
  };
  isRefreshing: boolean;
  isExporting: boolean;
  exportFormat: "excel" | "pdf" | null;
  onRefresh: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  branches: BranchResponse[];
  selectedBranchId: string;
  onBranchChange: (value: string) => void;
  safePage: number;
  totalPages: number;
};

export function InventoryPageHeader({
  activeBranchName,
  filteredProductsCount,
  filteredMovementsCount,
  filteredOpexCount,
  summary,
  isRefreshing,
  isExporting,
  exportFormat,
  onRefresh,
  onExportExcel,
  onExportPdf,
  search,
  onSearchChange,
  branches,
  selectedBranchId,
  onBranchChange,
  safePage,
  totalPages,
}: InventoryPageHeaderProps) {
  return (
    <>
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-amber-50 via-background to-sky-50 shadow-sm">
        <div className="border-b border-border/60 bg-[linear-gradient(110deg,rgba(251,191,36,.12),rgba(14,165,233,.10))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Inventory Control Center
                  </h1>
                  <p className="text-sm text-slate-600">
                    Cleaner browsing, safer values, and faster branch filtering.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {activeBranchName}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {filteredProductsCount} products
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {filteredMovementsCount} movements
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {filteredOpexCount} expenses
                </Badge>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
              <Button
                variant="default"
                className="w-full gap-2 lg:w-auto"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 lg:w-auto"
                onClick={onExportExcel}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                {exportFormat === "excel" ? "Exporting..." : "Export Excel"}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 lg:w-auto"
                onClick={onExportPdf}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                {exportFormat === "pdf" ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryPill label="Stock" value={summary.totalStock.toFixed(2)} />
          <SummaryPill label="Low Stock" value={String(summary.lowStockCount)} tone="warn" />
          <SummaryPill label="Revenue" value={formatCurrency(summary.totalRevenue)} tone="good" />
          <SummaryPill label="Gross Profit" value={formatCurrency(summary.totalProfit)} tone="good" />
          <SummaryPill label="OPEX" value={formatCurrency(summary.totalOpex)} tone="bad" />
          <SummaryPill
            label="Net"
            value={formatCurrency(summary.net)}
            tone={summary.net < 0 ? "bad" : "neutral"}
          />
        </div>
      </Card>

      <Card className="sticky top-2 z-10 overflow-hidden border-border/70 bg-background/90 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
          <div className="min-w-0">
            <p className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Search
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
                placeholder="Search products, movements, expenses..."
              />
            </div>
          </div>

          <div className="min-w-0">
            <ReusableSelect<BranchResponse>
              label="Branch"
              items={branches}
              value={selectedBranchId}
              onValueChange={onBranchChange}
              itemKey="id"
              itemLabel="name"
              placeholder="Select Branch"
              showAllOption={true}
            />
          </div>

          <div className="flex items-end">
            <div className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-sm lg:w-auto">
              <span className="text-muted-foreground">Page </span>
              <span className="font-semibold">
                {safePage}/{totalPages}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
