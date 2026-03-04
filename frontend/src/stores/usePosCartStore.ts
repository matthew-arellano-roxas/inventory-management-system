import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "@/types/api/shared";

type CartProductInput = {
  id: number;
  name: string;
  sellingPrice?: number;
  discount?: number;
  soldBy?: Unit;
};

export type PosCartItem = {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  branchId: number;
  soldBy?: Unit;
};

type PosCartState = {
  scopedBranchId: number | null;
  items: PosCartItem[];
  ensureBranchScope: (branchId: number | null) => void;
  addItem: (
    product: CartProductInput,
    branchId: number | null,
    quantity?: number,
  ) => void;
  removeItem: (productId: number) => void;
  setQty: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

export const usePosCartStore = create<PosCartState>()(
  persist(
    (set) => ({
      scopedBranchId: null,
      items: [],

      ensureBranchScope: (branchId) => {
        set((state) => {
          if (branchId === null) return state;
          if (state.scopedBranchId === null || state.scopedBranchId === branchId) {
            return { ...state, scopedBranchId: branchId };
          }

          // Prevent mixing carts across POS branches.
          return {
            scopedBranchId: branchId,
            items: [],
          };
        });
      },

      addItem: (product, branchId, quantity = 1) => {
        if (branchId === null) return;
        if (quantity <= 0) return;

        set((state) => {
          const nextScopedBranchId =
            state.scopedBranchId === null ? branchId : state.scopedBranchId;

          const baseState =
            nextScopedBranchId !== branchId
              ? { scopedBranchId: branchId, items: [] as PosCartItem[] }
              : { scopedBranchId: nextScopedBranchId, items: state.items };

          const existingIndex = baseState.items.findIndex(
            (item) => item.productId === product.id,
          );

          if (existingIndex >= 0) {
            const items = [...baseState.items];
            items[existingIndex] = {
              ...items[existingIndex],
              quantity: items[existingIndex].quantity + quantity,
              discount:
                (items[existingIndex].discount ?? 0) +
                Math.max(product.discount ?? 0, 0),
            };
            return { scopedBranchId: baseState.scopedBranchId, items };
          }

          return {
            scopedBranchId: baseState.scopedBranchId,
            items: [
              ...baseState.items,
              {
                productId: product.id,
                name: product.name,
                unitPrice: product.sellingPrice ?? 0,
                quantity,
                discount: Math.max(product.discount ?? 0, 0),
                branchId,
                soldBy: product.soldBy,
              },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      setQty: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "pos-cart-v1",
      version: 1,
      partialize: (state) => ({
        scopedBranchId: state.scopedBranchId,
        items: state.items,
      }),
    },
  ),
);
