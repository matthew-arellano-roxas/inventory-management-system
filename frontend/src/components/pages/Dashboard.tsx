import { getBranches } from "@/api/branch.api";
import { ProductReportRanking } from "@/components/dashboard/ProductReportRanking";
import { CurrentMonthCardGroup } from "@/components/dashboard/CurrentMonthCardGroup";
import { DailyReportChart } from "@/components/dashboard/DailyReportChart";
import { MonthlyReportChart } from "@/components/dashboard/MonthlyReportChart";
import { BranchReportChart } from "@/components/dashboard/BranchReportChart";
import { ReusableSelect } from "@/components/ReusableSelect";
import {
  Activity,
  Calendar,
  ChartArea,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchReport,
  getCurrentDayData,
  getCurrentMonthData,
  getDailyReport,
  getFinancialReportList,
  getMonthlyReport,
  getProductReport,
} from "@/api/report.api";
import { keys } from "@/api/query-keys";
import { Loader } from "../Loader";
import { toPHString } from "@/helpers/formatToPh";
import { formatCurrency } from "@/helpers/formatCurrency";
import type { BranchResponse } from "@/types/api/response";
export function Dashboard() {
  const [date] = useState(() => toPHString(new Date()));
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const dailyBranchId =
    selectedBranchId === "all" ? undefined : Number(selectedBranchId);

  const { data: currentDayData, isPending: isCurrentDayPending } = useQuery({
    queryKey: [...keys.reports.currentDay(), dailyBranchId ?? "all"],
    staleTime: 60 * 1000,
    queryFn: () => getCurrentDayData(dailyBranchId),
  });

  // Fetch Current Month Metrics
  const { data: currentMonthData, isPending: isCurrentMonthPending } = useQuery(
    {
      queryKey: keys.reports.currentMonth(),
      staleTime: 60 * 1000,
      queryFn: getCurrentMonthData,
    },
  );
  const { data: branches = [] } = useQuery({
    queryKey: keys.branches.all,
    staleTime: 60 * 1000,
    queryFn: getBranches,
  });

  // Fetch Daily Trends
  const { data: dailyData = [], isPending: isDailyPending } = useQuery({
    queryKey: [...keys.reports.daily(), dailyBranchId ?? "all"],
    staleTime: 60 * 1000,
    queryFn: () => getDailyReport(dailyBranchId),
  });

  // Fetch Monthly Trends
  const { data: monthlyData = [], isPending: isMonthlyPending } = useQuery({
    queryKey: keys.reports.monthly(),
    staleTime: 60 * 1000,
    queryFn: getMonthlyReport,
  });

  const { data: branchData = [], isPending: isBranchDataPending } = useQuery({
    queryKey: keys.reports.branch(),
    staleTime: 60 * 1000,
    queryFn: getBranchReport,
  });

  const { data: productData = [], isPending: isProductDataPending } = useQuery({
    queryKey: [...keys.reports.product(), "top-10"],
    staleTime: 60 * 1000,
    queryFn: () => getProductReport({ product_details: true, limit: 10 }),
  });

  const { data: financialData = [], isPending: isFinancialDataPending } = useQuery({
    queryKey: keys.reports.branchFinancialList(),
    staleTime: 60 * 1000,
    queryFn: getFinancialReportList,
  });

  const financialSummary = useMemo(
    () =>
      financialData.reduce(
        (acc, item) => ({
          totalOpex: acc.totalOpex + (Number(item.operationExpenses) || 0),
          netProfit: acc.netProfit + (Number(item.netProfit) || 0),
        }),
        { totalOpex: 0, netProfit: 0 },
      ),
    [financialData],
  );

  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-12 bg-muted">
      {/* 1. HEADER */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#22d3ee,_transparent_40%),radial-gradient(circle_at_bottom_left,_#f59e0b,_transparent_35%)]" />
        <div className="relative p-4 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black tracking-tight uppercase break-words">
                    Dashboard
                  </h1>
                  <p className="text-sm text-white/70 break-words">
                    Business metrics, revenue trends, and top product
                    performance.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  {Math.min(productData.length, 10)} Ranked Products
                </Badge>
                <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  Updated {date}
                </Badge>
              </div>
            </div>
            <div className="w-full rounded-xl bg-white/10 p-3 ring-1 ring-white/10 md:w-auto md:min-w-[170px]">
              <p className="text-[10px] uppercase tracking-widest text-white/60">
                System Status
              </p>
              <p className="mt-1 flex items-center text-sm font-semibold">
                <Activity className="mr-2 h-3.5 w-3.5 text-emerald-300" />
                Live System
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. STATS */}
      <section className="block w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold uppercase tracking-tight">
              Key Metrics
            </h2>
          </div>
          <div className="w-full sm:w-[240px]">
            <ReusableSelect<BranchResponse>
              items={branches}
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              itemKey="id"
              itemLabel="name"
              label="Live/Daily Branch"
              placeholder="Select Branch"
              showAllOption={true}
            />
          </div>
        </div>
        <div className="mb-6">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
            Today (Live)
          </p>
          {isCurrentDayPending ? (
            <Loader />
          ) : (
            <CurrentMonthCardGroup data={currentDayData} />
          )}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.65fr)]">
          <Card className="border-border/70 bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Current Month Snapshot
              </p>
            </div>
            {isCurrentMonthPending ? (
              <div className="p-4">
                <Loader />
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Revenue
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(currentMonthData?.revenue ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Gross Profit
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(currentMonthData?.profit ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Damage
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(currentMonthData?.damage ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-2 self-start sm:gap-3">
            <Card className="border-border/70 bg-card shadow-sm">
              <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Total OPEX
                </p>
                <p className="mt-1 text-sm font-bold leading-tight text-foreground sm:text-base">
                  {isFinancialDataPending
                    ? "Loading..."
                    : formatCurrency(financialSummary.totalOpex)}
                </p>
              </div>
            </Card>

            <Card className="border-border/70 bg-card shadow-sm">
              <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Net Profit
                </p>
                <p
                  className={`mt-1 text-sm font-bold leading-tight sm:text-base ${
                    financialSummary.netProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {isFinancialDataPending
                    ? "Loading..."
                    : formatCurrency(financialSummary.netProfit)}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. CHARTS SECTION */}
      <section className="w-full clear-both">
        <div className="flex items-center gap-2 mb-8">
          <ChartArea className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold uppercase tracking-tight">
            Analytics Trends
          </h2>
        </div>

        <div className="space-y-8">
          <div className="min-w-0">
            <div className="mb-4 border-b pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Last 7 Days
              </span>
            </div>
            <div className="flex-1 w-full relative">
              {isDailyPending ? (
                <Loader />
              ) : (
                <DailyReportChart data={dailyData} />
              )}
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col min-w-0 min-h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Monthly Revenue
                </span>
              </div>
              <div className="flex-1 w-full relative">
                {isMonthlyPending ? (
                  <Loader />
                ) : (
                  <MonthlyReportChart data={monthlyData} />
                )}
              </div>
            </div>
            <div className="flex flex-col min-w-0 min-h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Branch Performance
                </span>
              </div>
              <div className="flex-1 w-full relative">
                {isBranchDataPending ? (
                  <Loader />
                ) : (
                  <BranchReportChart data={branchData} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. RANKINGS SECTION - Added margin top to push it away from charts */}
      <section className="w-full mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-bold uppercase tracking-tight">
            Top Products
          </h2>
        </div>
        <div className="w-full overflow-hidden">
          {isProductDataPending ? (
            <Loader />
          ) : (
            <ProductReportRanking data={productData} />
          )}
        </div>
      </section>
    </div>
  );
}
