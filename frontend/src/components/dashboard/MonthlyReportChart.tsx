import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MonthRow } from "@/types/dashboard.types";
import type { MonthlyReportResponse } from "@/types/api/response/report.response";
import { getMonthRow } from "@/helpers/dashboard/transformer";
import { formatMonthRange } from "@/helpers/dashboard/formatMonthRange";
import { computeMonthlyTrend } from "@/helpers/dashboard/computeTrend";

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" }, // soft blue-gray
  profit: { label: "Gross Profit", color: "var(--chart-2)" }, // muted green
};

export function MonthlyReportChart({
  data,
  year,
  trendKey = "revenue",
  className,
}: {
  data: MonthlyReportResponse[];
  year?: number;
  trendKey?: "revenue" | "profit";
  className?: string;
}) {
  const chartData: MonthRow[] = useMemo(() => {
    const transformed = getMonthRow(data);
    if (transformed.length < 6) {
      const paddingNeeded = 6 - transformed.length;
      const padding = Array.from({ length: paddingNeeded }).map(() => ({
        month: "",
        revenue: undefined,
        profit: undefined,
      })) as unknown as MonthRow[];

      return [...transformed, ...padding];
    }
    return transformed;
  }, [data]);

  const realDataOnly = useMemo(
    () => chartData.filter((d) => d.month !== ""),
    [chartData],
  );
  const rangeText = useMemo(
    () => formatMonthRange(realDataOnly, year),
    [realDataOnly, year],
  );
  const trend = useMemo(
    () => computeMonthlyTrend(realDataOnly, trendKey),
    [realDataOnly, trendKey],
  );

  return (
    <Card className={`min-w-0 ${className}`}>
      <CardHeader>
        <CardTitle>Monthly Revenue & Gross Profit</CardTitle>
        <CardDescription>{rangeText}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[220px] sm:h-[260px] lg:h-[300px] w-full overflow-hidden"
        >
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                value ? String(value).slice(0, 3) : ""
              }
              interval={0}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={
                <ChartTooltipContent indicator="dashed" hideIndicator={false} />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={6}
              maxBarSize={32}
            />
            <Bar
              dataKey="profit"
              fill="var(--color-profit)"
              radius={6}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        {trend ? (
          <div className="flex gap-2 leading-none font-medium">
            {trend.direction === "up" ? (
              <>
                Trending up by {trend.percentText} this month{" "}
                <TrendingUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Trending down by {trend.percentText} this month{" "}
                <TrendingDown className="h-4 w-4" />
              </>
            )}
          </div>
        ) : (
          <div className="leading-none font-medium">
            Not enough data to compute trend
          </div>
        )}
        <div className="text-muted-foreground leading-none">
          Showing {trendKey} trend based on the last 2 months
        </div>
      </CardFooter>
    </Card>
  );
}
