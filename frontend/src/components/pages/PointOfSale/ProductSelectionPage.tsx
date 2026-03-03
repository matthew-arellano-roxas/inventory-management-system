import { DebouncedSearch } from "@/components/DebouncedSearch";
import { CreateProductFormModal } from "@/components/forms/CreateProductFormModal";
import { UpdateProductFormModal } from "@/components/forms/UpdateProductFormModal";
import { InputModal } from "@/components/InputModal";
import { Loader } from "@/components/Loader";
import { ProductSelectionSubHeader } from "@/components/pages/PointOfSale/components/ProductSelectionSubHeader";
import { useInfiniteCatalogScroll } from "@/components/pages/PointOfSale/hooks/useInfiniteCatalogScroll";
import { useProductSelectionFilters } from "@/components/pages/PointOfSale/hooks/useProductSelectionFilters";
import { useQueuedProductTransactions } from "@/components/pages/PointOfSale/hooks/useQueuedProductTransactions";
import { ManagedSelect } from "@/components/pos/ManagedSelect";
import { ProductActionModal } from "@/components/pos/ProductActionModal";
import { ProductSnippetCard } from "@/components/pos/ProductSnippetCard";
import { SelectionModal } from "@/components/pos/SelectionModal";
import { Tooltip } from "@/components/ToolTip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProductById } from "@/api/product.api";
import { useCategoryActions } from "@/hooks/useCategoryActions";
import { usePosCatalogQueries } from "@/hooks/usePosCatalogQueries";
import { useProductMutation } from "@/hooks/useProductMutation";
import { usePosCartStore } from "@/stores/usePosCartStore";
import type { Product } from "@/types/api/response";
import { Plus, Receipt, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAccessControl } from "@/auth/access-control";
import { ROLE_NAMES } from "@/auth/access-policy";
import { toast } from "sonner";

type ModalView =
  | "IDLE"
  | "CATEGORY_FORM"
  | "PRODUCT_CREATE_FORM"
  | "PRODUCT_UPDATE_FORM"
  | "SELECTION_MENU";

export function ProductSelectionPage() {
  const { hasRole } = useAccessControl();
  const { inputRef, search, branchId, categoryId, handleSearch } =
    useProductSelectionFilters();
  const {
    branchList,
    categoryList,
    productList,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePosCatalogQueries({ branchId, categoryId, search });
  const { loadMoreRef } = useInfiniteCatalogScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    itemCount: productList.length,
  });
  const ensureBranchScope = usePosCartStore((state) => state.ensureBranchScope);
  const addCartItem = usePosCartStore((state) => state.addItem);
  const { remove: deleteProductMutation } = useProductMutation();
  const cartItemCount = usePosCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const cartSubtotal = usePosCartStore((state) =>
    state.items.reduce(
      (total, item) =>
        total +
        Math.max(item.unitPrice * item.quantity - (item.discount ?? 0), 0),
      0,
    ),
  );
  const [activeModal, setActiveModal] = useState<ModalView>("IDLE");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductActionOpen, setIsProductActionOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { handleProductActionSubmit } = useQueuedProductTransactions({
    branchId,
    addCartItem,
  });
  const activeBranchName =
    branchId != null
      ? (branchList.find((branch) => branch.id === branchId)?.name ??
        `Branch #${branchId}`)
      : "Select Branch";
  const activeCategoryName =
    categoryId != null
      ? (categoryList.find((category) => category.id === categoryId)?.name ??
        "Filtered Category")
      : "All Categories";
  const {
    handleSelectCategory,
    handleUpdateCategory,
    handleCategoryDelete,
    handleCategoryModalClose,
    handleCategoryModalSubmit,
    categoryModal,
  } = useCategoryActions(setActiveModal);

  useEffect(() => {
    ensureBranchScope(branchId);
  }, [branchId, ensureBranchScope]);

  // New Item
  const handleNewItemModalSelect = (value: string) => {
    if (value === "Category") {
      setActiveModal("CATEGORY_FORM");
    } else {
      setActiveModal("PRODUCT_CREATE_FORM");
    }
  };

  const handleNewItemModalClose = () => {
    setActiveModal("IDLE");
  };

  const openProductActionModal = async (product: { id: number }) => {
    try {
      const fullProduct = await getProductById(product.id);
      if (!fullProduct) {
        console.error("Product details response was empty", {
          productId: product.id,
        });
        return;
      }
      setSelectedProduct(fullProduct);
      setIsProductActionOpen(true);
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  const handleProductCardClick = (product: { id: number }) => {
    void openProductActionModal(product);
  };

  const handleProductUpdate = (product: { id: number }) => {
    void (async () => {
      try {
        const fullProduct = await getProductById(product.id);
        if (!fullProduct) return;
        setEditingProduct(fullProduct);
        setActiveModal("PRODUCT_UPDATE_FORM");
      } catch (error) {
        console.error("Failed to load product for update", error);
      }
    })();
  };

  const handleProductDelete = (product: { id: number; name: string }) => {
    toast.warning(`Delete product "${product.name}"?`, {
      description: "This will permanently remove it from the catalog.",
      action: {
        label: deleteProductMutation.isPending ? "Deleting..." : "Delete",
        onClick: () => {
          deleteProductMutation.mutate(product.id);
        },
      },
    });
  };

  if (Object.values(isPending).every((val) => val === true)) return <Loader />;

  return (
    <div className="relative overflow-x-hidden pb-32 px-4 sm:px-6 lg:px-8">
      <ProductSelectionSubHeader
        branchName={activeBranchName}
        productCount={productList.length}
        categoryName={activeCategoryName}
        cartItemCount={cartItemCount}
        cartSubtotal={cartSubtotal}
      />

      <Card className="mb-6 border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1">
              <p className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Search Products
              </p>
              <DebouncedSearch
                delay={1000}
                onSearch={handleSearch}
                ref={inputRef}
                defaultValue={search}
              />
            </div>
            <Tooltip description="Add new content">
              <Button
                variant="default"
                size="icon"
                onClick={() => setActiveModal("SELECTION_MENU")}
                className="h-10 w-10 shrink-0 rounded-xl shadow-md"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>

          <ManagedSelect
            label="Category"
            className="w-full lg:max-w-[260px]"
            value={categoryId ?? undefined}
            options={categoryList}
            placeholder="Select Category"
            onSelect={handleSelectCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleCategoryDelete}
          />
        </div>
      </Card>

      {hasRole(ROLE_NAMES.ADMIN) && (
        <Card className="mb-6 border-border/60 bg-background/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Shortcuts
              </p>
              <p className="text-sm text-muted-foreground">
                Jump to operating expenses to record branch costs.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link to="/opex">
                <Receipt className="h-4 w-4" />
                Open OPEX Table
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <Card className="border-border/60 bg-background/80 p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Catalog
            </p>
            <p className="text-sm text-muted-foreground">
              Tap a product to open actions and add to cart.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {productList.length} Products
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {activeCategoryName}
            </Badge>
          </div>
        </div>

        {productList.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold">No products found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try changing the search term or category filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              }}
            >
              {productList.map((product) => (
                <ProductSnippetCard
                  key={product.id}
                  product={product}
                  onUpdate={handleProductUpdate}
                  onDelete={handleProductDelete}
                  onCardClick={handleProductCardClick}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="h-2" />
            {isFetchingNextPage && (
              <div className="py-2 text-center text-sm text-muted-foreground">
                Loading more products...
              </div>
            )}
            {!hasNextPage && productList.length > 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                End of catalog
              </div>
            )}
          </div>
        )}
      </Card>

      <InputModal
        isOpen={activeModal === "CATEGORY_FORM"}
        title={categoryModal.title}
        label={categoryModal.label}
        placeholder={categoryModal.placeholder}
        onClose={handleCategoryModalClose}
        autoComplete={false}
        onSubmit={handleCategoryModalSubmit}
      />
      <SelectionModal
        title="New Item"
        items={["Category", "Product"]}
        isOpen={activeModal === "SELECTION_MENU"}
        onSelect={handleNewItemModalSelect}
        onClose={handleNewItemModalClose}
      />
      <CreateProductFormModal
        setIsOpen={(state) =>
          state ? setActiveModal("PRODUCT_CREATE_FORM") : setActiveModal("IDLE")
        }
        categoryList={categoryList}
        branchId={branchId}
        isOpen={activeModal === "PRODUCT_CREATE_FORM"}
      />
      <UpdateProductFormModal
        setIsOpen={(state) =>
          setActiveModal(state ? "PRODUCT_UPDATE_FORM" : "IDLE")
        }
        categoryList={categoryList}
        branchId={branchId}
        isOpen={activeModal === "PRODUCT_UPDATE_FORM"}
        product={editingProduct}
      />
      <ProductActionModal
        product={selectedProduct}
        isOpen={isProductActionOpen}
        onClose={() => setIsProductActionOpen(false)}
        onSubmit={handleProductActionSubmit}
      />
    </div>
  );
}
