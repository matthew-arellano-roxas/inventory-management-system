import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type DefaultValues, useForm } from "react-hook-form";
import { useEffect } from "react";
import {
  createProductSchema,
  type CreateProductPayload,
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
import { Loader } from "../Loader";
import { Unit } from "@/types/api/shared";
import { useProductMutation } from "@/hooks/useProductMutation";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { CategoryResponse } from "@/types/api/response";

type ProductFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  branchId: number | null;
  categoryList: CategoryResponse[];
};

export function CreateProductFormModal({
  isOpen,
  setIsOpen,
  categoryList,
  branchId,
}: ProductFormProps) {
  const { create } = useProductMutation();
  const { isLoading: isEmailLoading, user } = useAuth0();
  const hasCategories = categoryList.length > 0;
  const getResetValues = (): DefaultValues<CreateProductPayload> =>
    ({
      name: "",
      costPerUnit: undefined,
      sellingPrice: undefined,
      categoryId: undefined,
      soldBy: Unit.PC,
      branchId: branchId ?? undefined,
    }) as DefaultValues<CreateProductPayload>;

  const form = useForm<CreateProductPayload>({
    resolver: zodResolver(createProductSchema),
    mode: "onBlur",
    defaultValues: {
      ...getResetValues(),
    },
  });

  useEffect(() => {
    if (branchId == null) return;
    form.setValue("branchId", branchId, { shouldValidate: true });
  }, [branchId, form]);

  useEffect(() => {
    if (!isOpen) return;
    form.reset(getResetValues());
  }, [form, isOpen, branchId]);

  async function onSubmitFn(data: CreateProductPayload) {
    if (branchId == null) return;

    await create.mutateAsync({
      ...data,
      branchId,
      addedBy: user?.email ?? "",
    });
    form.reset(getResetValues());
    setIsOpen(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset(getResetValues());
    }
    setIsOpen(open);
  };

  const { errors } = form.formState;

  if (isEmailLoading) {
    return <Loader />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
        </DialogHeader>
        <div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
          <form id="product-form" onSubmit={form.handleSubmit(onSubmitFn)}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Product Name</FieldLabel>
                <Input
                  id="name"
                  {...form.register("name")}
                  aria-invalid={!!errors.name}
                  autoComplete="off"
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
                  autoComplete="off"
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  {...form.register("costPerUnit", { valueAsNumber: true })}
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
                  autoComplete="off"
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
                      disabled={!hasCategories}
                      onOpenChange={(open) => {
                        if (!open) field.onBlur();
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid ? "true" : "false"}
                      >
                        <SelectValue
                          placeholder={
                            hasCategories
                              ? "Select a Category"
                              : "Create a category first"
                          }
                        />
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
                    {!hasCategories && (
                      <p className="text-sm text-muted-foreground">
                        Create a category first before creating a product.
                      </p>
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
            Select a branch from the POS route before creating a product.
          </p>
        )}

        <div className="mt-2 flex flex-row justify-start gap-2">
          <DialogClose asChild className="flex-1">
            <Button type="button" variant="outline" form="product-form">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            className="flex-1"
            form="product-form"
            disabled={branchId == null || create.isPending || !hasCategories}
          >
            {create.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
