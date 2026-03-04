import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Outlet, Link, Navigate, useLocation } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AxiosInterceptor } from "../axios/AxiosInterceptor";
import { usePosCartStore } from "@/stores/usePosCartStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBasket, Moon, Sun } from "lucide-react";
import { formatCurrency } from "@/helpers/formatCurrency";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { useAccessControl } from "@/auth/access-control";

const CART_BADGE_DECIMALS = 2;

export function RootLayout() {
  const {
    isAuthenticated,
    isAccessControlLoading,
    isAdmin,
    isUserRole,
    canAccessPos,
    canAccessTransactions,
    claims,
  } = useAccessControl();
  const location = useLocation();
  const items = usePosCartStore((state) => state.items);
  const scopedBranchId = usePosCartStore((state) => state.scopedBranchId);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);
  const formattedCartItemCount = Number(
    cartItemCount.toFixed(CART_BADGE_DECIMALS),
  );
  const cartSubtotal = items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );

  const branchMatch = location.pathname.match(/^\/pos\/(\d+)(?:\/|$)/);
  const routeBranchId = branchMatch ? Number(branchMatch[1]) : null;
  const checkoutBranchId = routeBranchId ?? scopedBranchId;
  const checkoutHref =
    checkoutBranchId !== null ? `/pos/${checkoutBranchId}/checkout` : null;
  const isPosCheckoutRoute = /^\/pos\/\d+\/checkout$/.test(location.pathname);
  const shouldShowFloatingCart =
    !isPosCheckoutRoute && checkoutHref && cartItemCount > 0;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const path = location.pathname;
  const hasAccessSignals = claims.roles.length > 0 || claims.permissions.length > 0;
  const shouldRestrictUser = hasAccessSignals && !isAdmin && (isUserRole || canAccessPos || canAccessTransactions);
  const isPosPath = path === "/pos" || path.startsWith("/pos/");
  const isTransactionsPath = path === "/transactions";
  const isAllowedRestrictedPath =
    (isPosPath && canAccessPos) || (isTransactionsPath && canAccessTransactions);

  if (isAuthenticated && !isAccessControlLoading && shouldRestrictUser) {
    if (path === "/") {
      if (canAccessPos) return <Navigate to="/pos" replace />;
      if (canAccessTransactions) return <Navigate to="/transactions" replace />;
    }

    if (!isAllowedRestrictedPath) {
      if (canAccessPos) return <Navigate to="/pos" replace />;
      if (canAccessTransactions) return <Navigate to="/transactions" replace />;
    }
  }

  return (
    <ProtectedRoute>
      <AxiosInterceptor>
        <SidebarProvider>
          <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
            <Toaster position="top-center" />
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-x-hidden p-2 md:p4 space-y-6 bg-muted">
              <header className="flex min-h-14 items-center justify-between gap-3 border-b py-2 sm:min-h-15 sm:py-3">
                <SidebarTrigger />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="gap-2"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </>
                  )}
                </Button>
              </header>
              <Outlet />
            </main>
            {shouldShowFloatingCart && (
              <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-1rem)] sm:bottom-6 sm:right-6 sm:max-w-[calc(100vw-3rem)]">
                <Button
                  asChild
                  className="h-auto min-h-14 max-w-full rounded-2xl px-4 py-3 shadow-xl shadow-primary/20"
                >
                  <Link
                    to={checkoutHref}
                    className="flex min-w-0 items-center justify-between gap-3 sm:min-w-[220px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ShoppingBasket className="h-5 w-5" />
                        <Badge className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center">
                          {formattedCartItemCount}
                        </Badge>
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs opacity-80">Cart</span>
                        <span className="font-semibold text-sm">
                          {formatCurrency(cartSubtotal)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs opacity-90">Checkout</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </SidebarProvider>
      </AxiosInterceptor>
    </ProtectedRoute>
  );
}
