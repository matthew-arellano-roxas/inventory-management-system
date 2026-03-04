import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/helpers/formatCurrency";
import { Store } from "lucide-react";

type ProductSelectionSubHeaderProps = {
  branchName: string;
  productCount: number;
  categoryName: string;
  cartItemCount: number;
  cartSubtotal: number;
};

const CART_COUNT_DECIMALS = 2;

export function ProductSelectionSubHeader({
  branchName,
  productCount,
  categoryName,
  cartItemCount,
  cartSubtotal,
}: ProductSelectionSubHeaderProps) {
  const formattedCartItemCount = Number(
    cartItemCount.toFixed(CART_COUNT_DECIMALS),
  );

  return (
    <Card className="relative mb-6 overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#22d3ee,_transparent_45%),radial-gradient(circle_at_bottom_left,_#f59e0b,_transparent_35%)]" />
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black uppercase tracking-tighter text-white sm:text-3xl">
                  Point of Sale
                </h1>
                <p className="text-sm font-medium text-white/70">{branchName}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                {productCount} Products
              </Badge>
              <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                {categoryName}
              </Badge>
            </div>
          </div>

          <div className="grid w-full max-w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[300px]">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/60">
                Cart Items
              </p>
              <p className="mt-1 text-lg font-bold leading-none">
                {formattedCartItemCount}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/60">
                Cart Total
              </p>
              <p className="mt-1 truncate text-lg font-bold leading-none">
                {formatCurrency(cartSubtotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
