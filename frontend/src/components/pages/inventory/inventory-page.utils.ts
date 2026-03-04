import type { ProductReportResponse } from "@/types/api/response";

export type InventoryProduct = {
  id: number | null;
  branchId: number | null;
  categoryId: number | null;
  name: string;
  costPerUnit: number | null;
  sellingPrice: number | null;
  soldBy: string | null;
  createdAt: string | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeProduct(raw: unknown): InventoryProduct | null {
  if (!isRecord(raw)) return null;

  const source = isRecord(raw.product) ? raw.product : raw;
  const id = asNumber(source.id);

  return {
    id,
    branchId: asNumber(source.branchId),
    categoryId: asNumber(source.categoryId),
    name:
      asString(source.name) ??
      asString(source.productName) ??
      (id != null ? `Product #${id}` : "Unnamed Product"),
    costPerUnit: asNumber(source.costPerUnit),
    sellingPrice: asNumber(source.sellingPrice),
    soldBy: asString(source.soldBy),
    createdAt: asString(source.createdAt),
  };
}

export function containsSearch(
  search: string,
  ...parts: Array<string | number | null | undefined>
) {
  if (!search.trim()) return true;
  const needle = search.toLowerCase();
  return parts.some((part) =>
    String(part ?? "")
      .toLowerCase()
      .includes(needle),
  );
}

export function getReportProductName(
  report: ProductReportResponse,
  productMap: Map<number, InventoryProduct>,
) {
  return (
    report.productName ??
    report.product?.name ??
    productMap.get(report.productId)?.name ??
    `Product #${report.productId}`
  );
}
