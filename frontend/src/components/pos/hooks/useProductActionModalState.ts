import { useState } from "react";
import { toast } from "sonner";
import { Unit } from "@/types/api/shared";
import { type Product } from "@/types/api/response/product.response";

export type TransactionType = "SALE" | "PURCHASE" | "DAMAGE" | "RETURN";
export type QuantityInputMode = "AMOUNT" | "QUANTITY";
export type DiscountMode = "AMOUNT" | "PERCENT";

type UseProductActionModalStateParams = {
  product: Product | null;
  isAdmin: boolean;
  isAccessControlLoading: boolean;
  onClose: () => void;
  onSubmit: (
    product: Product,
    quantity: number,
    type: TransactionType,
    discount: number,
  ) => void;
};

export function useProductActionModalState({
  product,
  isAdmin,
  isAccessControlLoading,
  onClose,
  onSubmit,
}: UseProductActionModalStateParams) {
  const [quantity, setQuantity] = useState("1");
  const [amountInput, setAmountInput] = useState("0");
  const [inputMode, setInputMode] = useState<QuantityInputMode>("AMOUNT");
  const [type, setType] = useState<TransactionType>("SALE");
  const [discountInput, setDiscountInput] = useState("0");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("AMOUNT");

  const effectiveType: TransactionType =
    !isAccessControlLoading && !isAdmin && type === "PURCHASE" ? "SALE" : type;
  const canUseAmountMode =
    product?.soldBy === Unit.KG &&
    (effectiveType === "SALE" || effectiveType === "RETURN");
  const usesAmountInput = canUseAmountMode && inputMode === "AMOUNT";
  const numericAmount = Math.max(parseFloat(amountInput) || 0, 0);
  const numericQuantity = product
    ? usesAmountInput
      ? product.sellingPrice > 0
        ? numericAmount / product.sellingPrice
        : 0
      : Math.max(parseFloat(quantity) || 0, 0)
    : 0;
  const totalSalePrice =
    product == null
      ? 0
      : usesAmountInput
        ? numericAmount
        : product.sellingPrice * numericQuantity;
  const totalPurchaseCost =
    product == null ? 0 : product.costPerUnit * numericQuantity;
  const supportsDiscount =
    effectiveType === "SALE" || effectiveType === "RETURN";
  const discountValue = Math.max(parseFloat(discountInput) || 0, 0);
  const discountBaseAmount = totalSalePrice;
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
  const unitAmount =
    product == null
      ? 0
      : effectiveType === "PURCHASE"
        ? product.costPerUnit
        : product.sellingPrice;
  const totalAmount =
    effectiveType === "PURCHASE" ? totalPurchaseCost : totalSalePrice;
  const netAmountWithDiscount = Math.max(
    totalSalePrice - normalizedDiscountAmount,
    0,
  );

  const resetState = () => {
    setQuantity("1");
    setAmountInput("0");
    setInputMode("AMOUNT");
    setType("SALE");
    setDiscountInput("0");
    setDiscountMode("AMOUNT");
  };

  const handleConfirm = () => {
    if (!product || numericQuantity <= 0) return;

    if (!isAdmin && effectiveType === "PURCHASE") {
      toast.error("Only admin can create purchase transactions.");
      setType("SALE");
      return;
    }

    onSubmit(product, numericQuantity, effectiveType, normalizedDiscountAmount);
    resetState();
    onClose();
  };

  const handleTypeChange = (nextType: string) => {
    if (nextType === "PURCHASE" && !isAdmin) {
      toast.error("Only admin can access purchase actions.");
      return;
    }

    const transactionType = nextType as TransactionType;
    setType(transactionType);
    setInputMode(
      product?.soldBy === Unit.KG &&
        (transactionType === "SALE" || transactionType === "RETURN")
        ? "AMOUNT"
        : "QUANTITY",
    );
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const adjustQuantity = (amount: number) => {
    setQuantity((prev) => {
      const nextValue = (parseFloat(prev) || 0) + amount;
      return nextValue > 0 ? nextValue.toString() : "0";
    });
  };

  const switchInputMode = (mode: QuantityInputMode) => {
    if (!canUseAmountMode || !product || mode === inputMode) return;

    if (mode === "AMOUNT") {
      setAmountInput((numericQuantity * product.sellingPrice).toFixed(2));
    } else {
      setQuantity(numericQuantity.toFixed(3));
    }

    setInputMode(mode);
  };

  return {
    amountInput,
    canUseAmountMode,
    discountInput,
    discountMode,
    discountPercent,
    effectiveType,
    formattedQuantity,
    handleAmountChange: setAmountInput,
    handleCancel,
    handleConfirm,
    handleDialogOpenChange,
    handleDiscountInputChange: setDiscountInput,
    handleDiscountModeChange: (value: string) =>
      setDiscountMode(value as DiscountMode),
    handleQuantityChange: setQuantity,
    handleTypeChange,
    inputMode,
    netAmountWithDiscount,
    normalizedDiscountAmount,
    numericQuantity,
    quantity,
    supportsDiscount,
    switchInputMode,
    totalAmount,
    unitAmount,
    usesAmountInput,
    adjustQuantity,
  };
}
