import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import {
  updateProductSchema,
  type UpdateProductPayload,
} from "@/schemas/ProductSchema";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";
import { Unit } from "@/types/api/shared";
import { useProductMutation } from "@/hooks/useProductMutation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { CategoryResponse, Product } from "@/types/api/response";

type UpdateProductFormModalProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  branchId: number | null;
  categoryList: CategoryResponse[];
  product: Product | null;
};

export function UpdateProductFormModal({
  isOpen,
  setIsOpen,
  categoryList,
  branchId,
  product,
}: UpdateProductFormModalProps) {
  const { update } = useProductMutation();

  const form = useForm<UpdateProductPayload>({
    resolver: zodResolver(updateProductSchema),
    mode: "onBlur",
    defaultValues: {
      soldBy: Unit.PC,
    },
  });

  useEffect(() => {
    if (!isOpen || !product) return;

    form.reset({
      name: product.name,
      costPerUnit: product.costPerUnit,
      soldBy: product.soldBy,
      sellingPrice: product.sellingPrice,
      categoryId: product.categoryId,
      branchId: branchId ?? product.branchId,
    });
  }, [branchId, form, isOpen, product]);

  useEffect(() => {
    if (branchId == null) return;
    form.setValue("branchId", branchId);
  }, [branchId, form]);

  async function onSubmitFn(data: UpdateProductPayload) {
    if (!product?.id) return;

    await update.mutateAsync({
      productId: product.id,
      data: {
        ...data,
        ...(branchId != null ? { branchId } : {}),
      },
    });

    form.reset();
    setIsOpen(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setIsOpen(open);
  };

  const { errors } = form.formState;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Update Product</DialogTitle>
        </DialogHeader>
        <div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
          <form
            id="update-product-form"
            onSubmit={form.handleSubmit(onSubmitFn)}
          >
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Product Name</FieldLabel>
                <Input
                  id="name"
                  {...form.register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <FieldError errors={[errors.name]} />}
              </Field>

              <Field data-invalid={!!errors.costPerUnit}>
                <FieldLabel htmlFor="costPerUnit">Cost per unit</FieldLabel>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="any"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-invalid={!!errors.costPerUnit}
                  {...form.register("costPerUnit", { valueAsNumber: true })}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                />
                {errors.costPerUnit && (
                  <FieldError errors={[errors.costPerUnit]} />
                )}
              </Field>

              <Field data-invalid={!!errors.sellingPrice}>
                <FieldLabel htmlFor="sellingPrice">Selling price</FieldLabel>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="any"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-invalid={!!errors.sellingPrice}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  {...form.register("sellingPrice", { valueAsNumber: true })}
                />
                {errors.sellingPrice && (
                  <FieldError errors={[errors.sellingPrice]} />
                )}
              </Field>

              <Controller
                name="soldBy"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Sold by</FieldLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid ? "true" : "false"}
                      >
                        <SelectValue placeholder="Select a Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Unit</SelectLabel>
                          <SelectItem value={Unit.PC}>Piece</SelectItem>
                          <SelectItem value={Unit.KG}>Kilogram</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="categoryId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid ? "true" : "false"}
                      >
                        <SelectValue placeholder="Select a Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Category</SelectLabel>
                          {categoryList.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={String(category.id)}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="branchId"
                control={form.control}
                render={({ field }) => (
                  <input type="hidden" {...field} value={field.value ?? ""} />
                )}
              />
            </FieldGroup>
          </form>
        </div>

        {branchId == null && (
          <p className="mt-2 text-sm text-destructive">
            Invalid branch route. Open POS with a branch selected.
          </p>
        )}

        <div className="mt-2 flex flex-row justify-start gap-2">
          <DialogClose asChild className="flex-1">
            <Button type="button" variant="outline" form="update-product-form">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            className="flex-1"
            form="update-product-form"
            disabled={update.isPending || !product || branchId == null}
          >
            {update.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
