export const keys = {
  reports: {
    all: ["reports"] as const,
    currentDay: () => [...keys.reports.all, "current-day"] as const,
    currentMonth: () => [...keys.reports.all, "current-month"] as const,
    daily: () => [...keys.reports.all, "daily"] as const,
    monthly: () => [...keys.reports.all, "monthly"] as const,
    branch: () => [...keys.reports.all, "branch"] as const,
    branchFinancialList: () => [...keys.reports.all, "branch-financial-list"] as const,
    branchFinancialById: (branchId: number) =>
      [...keys.reports.all, "branch-financial-by-id", branchId] as const,
    product: () => [...keys.reports.all, "product"] as const,
  },
  announcements: {
    all: ["announcements"] as const,
  },
  transactions: {
    all: ["transactions"] as const,
  },
  branches: {
    all: ["branches"] as const,
  },
  products: {
    all: ["products"] as const,
    details: () => [...keys.products.all, "details"] as const,
    snippets: () => [...keys.products.all, "snippets"] as const,
    filters: () => [...keys.products.all, "filters"] as const, 
  },
  categories: {
    all: ["categories"] as const,
  },
};
