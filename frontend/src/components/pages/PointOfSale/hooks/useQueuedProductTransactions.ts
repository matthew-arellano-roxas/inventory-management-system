import { createTransaction } from "@/api/transaction.api";
import { TransactionType } from "@/types/api/payload";
import type { Product } from "@/types/api/response";
import type { Unit } from "@/types/api/shared";
import { useRef } from "react";
import { toast } from "sonner";

export type PosProductActionType = "SALE" | "PURCHASE" | "DAMAGE" | "RETURN";

type AddCartItemFn = (
  product: {
    id: number;
    name: string;
    sellingPrice?: number;
    discount?: number;
    soldBy?: Unit;
  },
  branchId: number | null,
  quantity?: number,
) => void;

type UseQueuedProductTransactionsParams = {
  branchId: number | null;
  addCartItem: AddCartItemFn;
};

export function useQueuedProductTransactions({
  branchId,
  addCartItem,
}: UseQueuedProductTransactionsParams) {
  const pendingTransactionTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );

  const handleProductActionSubmit = (
    product: Product,
    quantity: number,
    type: PosProductActionType,
    discount = 0,
  ) => {
    if (type === "SALE") {
      if (product.id == null) {
        console.error("Cannot add product without an id to cart", product);
        return;
      }

      addCartItem(
        {
          id: product.id,
          name: product.name,
          sellingPrice: product.sellingPrice,
          discount,
          soldBy: product.soldBy,
        },
        branchId,
        quantity,
      );
      toast.success(`Added ${quantity} ${product.name} to cart`);
      return;
    }

    if (branchId == null) {
      toast.error("Select a branch before submitting a transaction.");
      return;
    }

    if (product.id == null) {
      toast.error("Cannot submit transaction for a product without an id.");
      return;
    }
    const productId = product.id;

    let cancelled = false;
    const actionLabel =
      type === "RETURN" ? "Return" : type === "PURCHASE" ? "Purchase" : "Damage";

    const timeoutId = setTimeout(() => {
      pendingTransactionTimeoutsRef.current.delete(timeoutId);
      if (cancelled) return;

      void (async () => {
        try {
          await createTransaction({
            type:
              type === "RETURN"
                ? TransactionType.RETURN
                : type === "PURCHASE"
                  ? TransactionType.PURCHASE
                  : TransactionType.DAMAGE,
            branchId,
            items: [
              {
                productId,
                productName: product.name,
                quantity,
                discount,
              },
            ],
          });

          toast.success(`${actionLabel} transaction submitted.`);
        } catch (error) {
          console.error(`Failed to submit ${type.toLowerCase()} transaction`, error);
          toast.error(`Failed to submit ${actionLabel.toLowerCase()} transaction.`);
        }
      })();
    }, 5000);

    pendingTransactionTimeoutsRef.current.add(timeoutId);

    toast.success(`${actionLabel} queued for submission.`, {
      description: "Undo within 5 seconds to cancel.",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          cancelled = true;
          clearTimeout(timeoutId);
          pendingTransactionTimeoutsRef.current.delete(timeoutId);
          toast.message(`${actionLabel} submission cancelled.`);
        },
      },
    });
  };

  return { handleProductActionSubmit };
}
