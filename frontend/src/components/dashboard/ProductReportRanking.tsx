"use client";

import { useMemo } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import type { ProductReportResponse } from "@/types/api/response/report.response";

function formatCurrency(n: number) {
  return n.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });
}

function formatStock(n: number) {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ProductReportRanking({
  data,
}: {
  data: ProductReportResponse[];
}) {
  const ranked = useMemo(() => {
    return [...data]
      .map((p) => ({
        ...p,
        displayName: p.productName?.trim() || p.product?.name?.trim() || `Product #${p.productId}`,
        margin: p.revenue ? (p.profit / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [data]);

  return (
    <Card className="w-full border-border/70 bg-card/70 shadow-sm">
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
        <CardDescription>Ranked by revenue</CardDescription>
      </CardHeader>

      <CardContent>
        {/* --- MOBILE VIEW: Visible only on small screens --- */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {ranked.map((p, index) => {
            const margin = p.margin;
            return (
              <div
                key={p.id}
                className="relative flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-4 shadow-sm"
              >
                {/* Rank Badge */}
                <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-muted/70 text-xs font-bold">
                  #{index + 1}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-black uppercase text-muted-foreground">
                    Product
                  </p>
                  <p className="font-bold text-lg">{p.displayName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Revenue
                    </p>
                    <p className="text-emerald-600 font-bold">
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Gross Profit
                    </p>
                    <p className="text-indigo-600 font-bold">
                      {formatCurrency(p.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Stock
                    </p>
                    <p
                      className={
                        p.stock < 30 ? "text-rose-600 font-bold" : "font-bold"
                      }
                    >
                      {formatStock(p.stock)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Margin
                    </p>
                    <p className="font-bold text-foreground">
                      {margin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- DESKTOP VIEW: Hidden on mobile --- */}
        <div className="hidden md:block w-full overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">Gross Profit</th>
                <th className="text-right py-2">Stock</th>
                <th className="text-right py-2">Margin</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, index) => {
                const margin = p.margin;
                const marginColor =
                  margin >= 25
                    ? "text-emerald-600"
                    : margin >= 15
                      ? "text-yellow-600"
                      : "text-rose-600";

                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 font-semibold text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="py-3 font-medium">{p.displayName}</td>
                    <td className="py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(p.revenue)}
                    </td>
                    <td className="py-3 text-right font-medium text-indigo-600">
                      {formatCurrency(p.profit)}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${p.stock < 30 ? "text-rose-600" : ""}`}
                    >
                      {formatStock(p.stock)}
                    </td>
                    <td
                      className={`py-3 text-right font-semibold ${marginColor}`}
                    >
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
