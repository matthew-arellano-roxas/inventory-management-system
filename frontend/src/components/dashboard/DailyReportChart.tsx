import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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
import type { DailyReportResponse } from "@/types/api/response/report.response";
import { computeMonthlyTrend } from "@/helpers/dashboard/computeTrend";

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Gross Profit", color: "var(--chart-2)" },
};

export function DailyReportChart({
  data,
  trendKey = "revenue",
  className,
}: {
  data: DailyReportResponse[];
  trendKey?: "revenue" | "profit";
  className?: string;
}) {
  const chartData = useMemo(
    () =>
      data.map((report) => ({
        day: format(new Date(report.date), "EEE"),
        fullDate: format(new Date(report.date), "MMM d"),
        revenue: Number(report.revenue) || 0,
        profit: Number(report.profit) || 0,
      })),
    [data],
  );

  const rangeText = useMemo(() => {
    if (!chartData.length) return "No daily data";

    const first = chartData[0]?.fullDate;
    const last = chartData[chartData.length - 1]?.fullDate;

    if (!first || !last) return "No daily data";

    return `${first} - ${last}`;
  }, [chartData]);

  const trend = useMemo(
    () => computeMonthlyTrend(chartData, trendKey),
    [chartData, trendKey],
  );

  return (
    <Card className={`min-w-0 ${className}`}>
      <CardHeader>
        <CardTitle>Daily Revenue & Gross Profit</CardTitle>
        <CardDescription>{rangeText}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[220px] sm:h-[260px] lg:h-[300px] w-full overflow-hidden"
        >
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              interval={0}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={
                <ChartTooltipContent indicator="dashed" hideIndicator={false} />
              }
            />
            <Area
              dataKey="revenue"
              fill="var(--color-revenue)"
              fillOpacity={0.2}
              stroke="var(--color-revenue)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="profit"
              fill="var(--color-profit)"
              fillOpacity={0.18}
              stroke="var(--color-profit)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        {trend ? (
          <div className="flex gap-2 leading-none font-medium">
            {trend.direction === "up" ? (
              <>
                Trending up by {trend.percentText} versus yesterday{" "}
                <TrendingUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Trending down by {trend.percentText} versus yesterday{" "}
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
          Showing {trendKey} trend for the last 7 days
        </div>
      </CardFooter>
    </Card>
  );
}
