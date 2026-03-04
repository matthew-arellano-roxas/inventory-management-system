import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Minus,
  PackagePlus,
  Plus,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/types/api/response/product.response";
import { Unit } from "@/types/api/shared";
import { useAccessControl } from "@/auth/access-control";
import { toast } from "sonner";

type TransactionType = "SALE" | "PURCHASE" | "DAMAGE" | "RETURN";
type QuantityInputMode = "AMOUNT" | "QUANTITY";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    product: Product,
    quantity: number,
    type: TransactionType,
    discount: number,
  ) => void;
}

export function ProductActionModal({
  product,
  isOpen,
  onClose,
  onSubmit,
}: ProductModalProps) {
  const { isAdmin, isAccessControlLoading } = useAccessControl();
  const [quantity, setQuantity] = useState<string>("1");
  const [amountInput, setAmountInput] = useState<string>("0");
  const [inputMode, setInputMode] = useState<QuantityInputMode>("AMOUNT");
  const [type, setType] = useState<TransactionType>("SALE");
  const [discountInput, setDiscountInput] = useState<string>("0");
  const [discountMode, setDiscountMode] = useState<"AMOUNT" | "PERCENT">(
    "AMOUNT",
  );

  const effectiveType: TransactionType =
    !isAccessControlLoading && !isAdmin && type === "PURCHASE" ? "SALE" : type;

  const canUseAmountMode =
    product?.soldBy === Unit.KG &&
    (effectiveType === "SALE" || effectiveType === "RETURN");
  const usesAmountInput = canUseAmountMode && inputMode === "AMOUNT";

  if (!product) return null;

  const numericAmount = Math.max(parseFloat(amountInput) || 0, 0);
  const numericQuantity = usesAmountInput
    ? product.sellingPrice > 0
      ? numericAmount / product.sellingPrice
      : 0
    : Math.max(parseFloat(quantity) || 0, 0);
  const totalSalePrice = usesAmountInput
    ? numericAmount
    : product.sellingPrice * numericQuantity;
  const totalPurchaseCost = product.costPerUnit * numericQuantity;
  const discountValue = Math.max(parseFloat(discountInput) || 0, 0);
  const discountBaseAmount = totalSalePrice;
  const supportsDiscount =
    effectiveType === "SALE" || effectiveType === "RETURN";
  const computedDiscountAmount = supportsDiscount
    ? discountMode === "PERCENT"
      ? (discountBaseAmount * discountValue) / 100
      : discountValue
    : 0;
  const normalizedDiscountAmount = Number(
    Math.max(Math.min(computedDiscountAmount, discountBaseAmount), 0).toFixed(
      2,
    ),
  );
  const discountPercent =
    supportsDiscount && discountBaseAmount > 0
      ? (normalizedDiscountAmount / discountBaseAmount) * 100
      : 0;
  const formattedQuantity = numericQuantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  const handleConfirm = () => {
    if (numericQuantity <= 0) return;
    if (!isAdmin && effectiveType === "PURCHASE") {
      toast.error("Only admin can create purchase transactions.");
      setType("SALE");
      return;
    }
    onSubmit(product, numericQuantity, effectiveType, normalizedDiscountAmount);
    setQuantity("1");
    setAmountInput("0");
    setInputMode("AMOUNT");
    setType("SALE");
    setDiscountInput("0");
    setDiscountMode("AMOUNT");
    onClose();
  };

  const adjustQuantity = (amount: number) => {
    setQuantity((prev) => {
      const nextValue = (parseFloat(prev) || 0) + amount;
      return nextValue > 0 ? nextValue.toString() : "0";
    });
  };

  const switchInputMode = (mode: QuantityInputMode) => {
    if (!canUseAmountMode || mode === inputMode) return;

    if (mode === "AMOUNT") {
      setAmountInput((numericQuantity * product.sellingPrice).toFixed(2));
    } else {
      setQuantity(numericQuantity.toFixed(3));
    }

    setInputMode(mode);
  };

  const getTheme = () => {
    switch (effectiveType) {
      case "DAMAGE":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Report Damage",
        };
      case "RETURN":
        return {
          icon: <RotateCcw className="h-4 w-4" />,
          label: "Process Return",
        };
      case "PURCHASE":
        return {
          icon: <PackagePlus className="h-4 w-4" />,
          label: "Add Stock",
        };
      default:
        return {
          icon: <ShoppingCart className="h-4 w-4" />,
          label: "Add to Cart",
        };
    }
  };

  const theme = getTheme();
  const unitAmount =
    effectiveType === "PURCHASE" ? product.costPerUnit : product.sellingPrice;
  const totalAmount =
    effectiveType === "PURCHASE" ? totalPurchaseCost : totalSalePrice;
  const netAmountWithDiscount = Math.max(
    totalSalePrice - normalizedDiscountAmount,
    0,
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setInputMode("AMOUNT");
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>Select transaction details</DialogDescription>
        </DialogHeader>

        <Tabs
          value={effectiveType}
          onValueChange={(value) => {
            if (value === "PURCHASE" && !isAdmin) {
              toast.error("Only admin can access purchase actions.");
              return;
            }
            const nextType = value as TransactionType;
            setType(nextType);
            setInputMode(
              product.soldBy === Unit.KG &&
                (nextType === "SALE" || nextType === "RETURN")
                ? "AMOUNT"
                : "QUANTITY",
            );
          }}
          className="w-full"
        >
          <TabsList
            className={cn(
              "grid w-full",
              isAdmin ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            <TabsTrigger value="SALE">Sale</TabsTrigger>
            {isAdmin && <TabsTrigger value="PURCHASE">Purchase</TabsTrigger>}
            <TabsTrigger value="RETURN">Return</TabsTrigger>
            <TabsTrigger
              value="DAMAGE"
              className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
            >
              Damage
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-6 py-4">
          {effectiveType !== "DAMAGE" && (
            <div className="flex items-center justify-between rounded-lg border border-dashed bg-secondary/50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {effectiveType === "PURCHASE" ? "Unit Cost" : "Unit Price"}
                </p>
                <p className="text-lg font-bold">PHP {unitAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {effectiveType === "RETURN"
                    ? "Refund Amount"
                    : effectiveType === "PURCHASE"
                      ? "Total Cost"
                      : "Total Price"}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    effectiveType === "RETURN"
                      ? "text-orange-600"
                      : effectiveType === "PURCHASE"
                        ? "text-emerald-600"
                        : "text-primary",
                  )}
                >
                  PHP{" "}
                  {(supportsDiscount
                    ? netAmountWithDiscount
                    : totalAmount
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
                {supportsDiscount && normalizedDiscountAmount > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Discount: PHP{" "}
                    {normalizedDiscountAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ({discountPercent.toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>
          )}

          {effectiveType === "DAMAGE" && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-xs font-medium text-destructive">
                Reporting damage will deduct {formattedQuantity}{" "}
                {product.soldBy}
                (s) from current stock.
              </p>
            </div>
          )}

          {effectiveType === "PURCHASE" && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              <p className="text-xs font-medium text-emerald-700">
                Purchasing stock will add {formattedQuantity} {product.soldBy}
                (s) to current inventory.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={usesAmountInput ? "amount" : "quantity"}>
                {usesAmountInput
                  ? `Amount to ${effectiveType.toLowerCase()} (PHP)`
                  : `Quantity to ${effectiveType.toLowerCase()} (${product.soldBy})`}
              </Label>
              {canUseAmountMode && (
                <Tabs
                  value={inputMode}
                  onValueChange={(value) =>
                    switchInputMode(value as QuantityInputMode)
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
              )}
            </div>
            {usesAmountInput ? (
              <div className="space-y-2">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="text-center text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground">
                  Equivalent quantity: {formattedQuantity} {product.soldBy}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustQuantity(-1)}
                  disabled={numericQuantity <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-center text-lg font-bold"
                />

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustQuantity(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {supportsDiscount && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="discount">Discount</Label>
                <Tabs
                  value={discountMode}
                  onValueChange={(value) =>
                    setDiscountMode(value as "AMOUNT" | "PERCENT")
                  }
                  className="w-auto"
                >
                  <TabsList className="grid h-8 grid-cols-2">
                    <TabsTrigger value="AMOUNT" className="px-3 text-xs">
                      Amount
                    </TabsTrigger>
                    <TabsTrigger value="PERCENT" className="px-3 text-xs">
                      %
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountMode === "AMOUNT" ? "0.00" : "0"}
              />
              <p className="text-xs text-muted-foreground">
                {discountMode === "AMOUNT"
                  ? `Equivalent to ${discountPercent.toFixed(2)}% off the current ${effectiveType === "RETURN" ? "refund" : "line"} total.`
                  : `Equivalent discount amount: PHP ${normalizedDiscountAmount.toFixed(2)}.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setInputMode("AMOUNT");
              onClose();
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant={effectiveType === "DAMAGE" ? "destructive" : "default"}
            onClick={handleConfirm}
            className="flex-[2] gap-2"
            disabled={numericQuantity <= 0}
          >
            {theme.icon}
            {theme.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
