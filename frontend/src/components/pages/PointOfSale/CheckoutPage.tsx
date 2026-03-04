import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastApiError } from "@/api/api-error-handler";
import { createTransaction } from "@/api/transaction.api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/helpers/formatCurrency";
import { usePosCartStore } from "@/stores/usePosCartStore";
import { TransactionType } from "@/types/api/payload";
import { Unit } from "@/types/api/shared";
import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

type QuantityInputMode = "AMOUNT" | "QUANTITY";
const CHECKOUT_DECIMALS = 2;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { branchId: branchIdParam } = useParams();
  const branchId =
    branchIdParam && !Number.isNaN(Number(branchIdParam))
      ? Number(branchIdParam)
      : null;

  const ensureBranchScope = usePosCartStore((state) => state.ensureBranchScope);
  const items = usePosCartStore((state) => state.items);
  const setQty = usePosCartStore((state) => state.setQty);
  const removeItem = usePosCartStore((state) => state.removeItem);
  const clearCart = usePosCartStore((state) => state.clearCart);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputModes, setInputModes] = useState<Record<number, QuantityInputMode>>(
    {},
  );
  const [draftInputs, setDraftInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    ensureBranchScope(branchId);
  }, [branchId, ensureBranchScope]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const formattedItemCount = Number(itemCount.toFixed(CHECKOUT_DECIMALS));
  const subtotal = items.reduce(
    (total, item) =>
      total + Math.max(item.unitPrice * item.quantity - (item.discount ?? 0), 0),
    0,
  );

  const canUseAmountMode = (item: (typeof items)[number]) =>
    item.soldBy === Unit.KG;

  const getInputMode = (item: (typeof items)[number]): QuantityInputMode =>
    canUseAmountMode(item) ? (inputModes[item.productId] ?? "AMOUNT") : "QUANTITY";

  const usesAmountInput = (item: (typeof items)[number]) =>
    canUseAmountMode(item) && getInputMode(item) === "AMOUNT";

  const getDisplayValue = (item: (typeof items)[number]) => {
    const draftValue = draftInputs[item.productId];
    if (draftValue !== undefined) return draftValue;

    if (usesAmountInput(item)) {
      return String(Number((item.unitPrice * item.quantity).toFixed(2)));
    }

    return String(Number(item.quantity.toFixed(CHECKOUT_DECIMALS)));
  };

  const handleInputModeChange = (
    item: (typeof items)[number],
    mode: QuantityInputMode,
  ) => {
    if (!canUseAmountMode(item)) return;
    setInputModes((prev) => ({ ...prev, [item.productId]: mode }));
    setDraftInputs((prev) => {
      const next = { ...prev };
      delete next[item.productId];
      return next;
    });
  };

  const handleQuantityInput = (item: (typeof items)[number], value: string) => {
    setDraftInputs((prev) => ({ ...prev, [item.productId]: value }));
    if (value === "") return;

    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;

    if (usesAmountInput(item)) {
      const nextQuantity =
        item.unitPrice > 0
          ? Number((parsed / item.unitPrice).toFixed(CHECKOUT_DECIMALS))
          : 0;
      setQty(item.productId, nextQuantity);
      return;
    }

    setQty(item.productId, Number(parsed.toFixed(CHECKOUT_DECIMALS)));
  };

  const handleQuantityBlur = (item: (typeof items)[number]) => {
    const draftValue = draftInputs[item.productId];
    if (draftValue === undefined) return;

    if (draftValue === "") {
      setDraftInputs((prev) => {
        const next = { ...prev };
        delete next[item.productId];
        return next;
      });
      return;
    }

    const parsed = Number(draftValue);
    if (Number.isNaN(parsed)) {
      setDraftInputs((prev) => {
        const next = { ...prev };
        delete next[item.productId];
        return next;
      });
    }
  };

  const adjustItemQuantity = (item: (typeof items)[number], delta: number) => {
    setDraftInputs((prev) => {
      const next = { ...prev };
      delete next[item.productId];
      return next;
    });
    setQty(
      item.productId,
      Number((item.quantity + delta).toFixed(CHECKOUT_DECIMALS)),
    );
  };

  const handleRemoveItem = (productId: number) => {
    setInputModes((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setDraftInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    removeItem(productId);
  };

  const handleClearCart = () => {
    setInputModes({});
    setDraftInputs({});
    clearCart();
  };

  const handleCheckoutSubmit = async () => {
    if (branchId == null) {
      toast.error("Invalid branch.");
      return;
    }

    if (items.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction({
        type: TransactionType.SALE,
        branchId,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          discount: item.discount ?? 0,
        })),
      });

      clearCart();
      setInputModes({});
      setDraftInputs({});
      toast.success("Checkout completed successfully.");
      navigate(`/pos/${branchId}`);
    } catch (error) {
      console.error("Failed to submit checkout transaction", error);
      toastApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (branchId === null) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Invalid branch. Go back and select a branch first.
        </p>
        <Button className="mt-4 w-fit" onClick={() => navigate("/pos")}>
          Back to POS
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_#38bdf8,_transparent_45%),radial-gradient(circle_at_bottom_left,_#f59e0b,_transparent_35%)]" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <ShoppingBasket className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight uppercase">
                  Checkout
                </h1>
                <p className="text-sm text-white/70">
                  Review cart items and adjust quantity before checkout.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/60">
                  Items
                </p>
                <p className="mt-1 text-lg font-bold leading-none">
                  {formattedItemCount}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/60">
                  Subtotal
                </p>
                <p className="mt-1 truncate text-lg font-bold leading-none">
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" asChild>
              <Link to={`/pos/${branchId}`}>Back to Products</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearCart}
              disabled={items.length === 0 || isSubmitting}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Clear Cart
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cart Details
            </p>
            <p className="text-sm text-muted-foreground">
              Edit quantities, remove items, and confirm totals.
            </p>
          </div>
          <div className="rounded-xl border bg-background/80 px-3 py-2 text-sm shadow-sm">
            <span className="text-muted-foreground">Branch </span>
            <span className="font-semibold">#{branchId}</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-background/70 py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <ShoppingBasket className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">Your cart is empty</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Add products from the POS catalog to continue.
            </p>
            <Button asChild>
              <Link to={`/pos/${branchId}`}>Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 md:hidden">
              {items.map((item) => (
                <Card
                  key={item.productId}
                  className="overflow-hidden border-border/70 bg-background/90 p-0 shadow-sm"
                >
                  <div className="border-b bg-muted/40 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Unit Price: {formatCurrency(item.unitPrice)}
                        </p>
                        {(item.discount ?? 0) > 0 && (
                          <p className="mt-1 text-xs text-emerald-600">
                            Discount: {formatCurrency(item.discount ?? 0)}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="shrink-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => adjustItemQuantity(item, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getDisplayValue(item)}
                        onChange={(e) => handleQuantityInput(item, e.target.value)}
                        onBlur={() => handleQuantityBlur(item)}
                        className="flex-1 border-muted-foreground/20 text-center font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => adjustItemQuantity(item, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {canUseAmountMode(item) && (
                      <div className="mt-3 flex justify-center">
                        <Tabs
                          value={getInputMode(item)}
                          onValueChange={(value) =>
                            handleInputModeChange(item, value as QuantityInputMode)
                          }
                          className="w-auto"
                        >
                          <TabsList className="grid h-8 grid-cols-2">
                            <TabsTrigger value="AMOUNT" className="px-3 text-xs">
                              Amount
                            </TabsTrigger>
                            <TabsTrigger value="QUANTITY" className="px-3 text-xs">
                              Qty
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Line Total</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          Math.max(
                            item.unitPrice * item.quantity - (item.discount ?? 0),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <div className="rounded-2xl border bg-background/80 p-2 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="px-3">Product</TableHead>
                      <TableHead className="px-3 text-right">Unit Price</TableHead>
                      <TableHead className="px-3 text-center">Amount / Qty</TableHead>
                      <TableHead className="px-3 text-right">Total</TableHead>
                      <TableHead className="px-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="px-3 font-medium">{item.name}</TableCell>
                        <TableCell className="px-3 text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="px-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => adjustItemQuantity(item, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={getDisplayValue(item)}
                                onChange={(e) =>
                                  handleQuantityInput(item, e.target.value)
                                }
                                onBlur={() => handleQuantityBlur(item)}
                                className="w-24 text-center font-semibold"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => adjustItemQuantity(item, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {canUseAmountMode(item) && (
                              <div className="flex justify-center">
                                <Tabs
                                  value={getInputMode(item)}
                                  onValueChange={(value) =>
                                    handleInputModeChange(
                                      item,
                                      value as QuantityInputMode,
                                    )
                                  }
                                  className="w-auto"
                                >
                                  <TabsList className="grid h-8 grid-cols-2">
                                    <TabsTrigger
                                      value="AMOUNT"
                                      className="px-3 text-xs"
                                    >
                                      Amount
                                    </TabsTrigger>
                                    <TabsTrigger
                                      value="QUANTITY"
                                      className="px-3 text-xs"
                                    >
                                      Qty
                                    </TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 text-right font-semibold">
                          <div>
                            <p>
                              {formatCurrency(
                                Math.max(
                                  item.unitPrice * item.quantity -
                                    (item.discount ?? 0),
                                  0,
                                ),
                              )}
                            </p>
                            {(item.discount ?? 0) > 0 && (
                              <p className="text-xs font-normal text-emerald-600">
                                -{formatCurrency(item.discount ?? 0)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="sticky bottom-3 z-10 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {formattedItemCount} item
                  {formattedItemCount === 1 ? "" : "s"} in cart
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Subtotal
                  </p>
                  <p className="text-2xl font-black tracking-tight">
                    {formatCurrency(subtotal)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button variant="outline" asChild className="h-12">
                  <Link to={`/pos/${branchId}`}>Add to Cart</Link>
                </Button>
                <Button
                  className="h-12 px-6"
                  onClick={() => void handleCheckoutSubmit()}
                  disabled={items.length === 0 || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Proceed to Checkout"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
