import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getBranches } from "@/api/branch.api";
import { getCategories } from "@/api/category.api";
import { getProductSnippetsPage } from "@/api/product.api";
import { keys } from "@/api/query-keys";
import { cleanQuery } from "@/helpers/cleanQuery";
import type { ProductQuery } from "@/types/api/shared/search-params.types";

function getNextPageFromMeta(
  meta: Record<string, unknown> | undefined,
  fallbackNextPage: number,
) {
  if (!meta) return fallbackNextPage;

  if (typeof meta.nextPage === "number") {
    return meta.nextPage;
  }

  if (typeof meta.hasNextPage === "boolean") {
    return meta.hasNextPage ? fallbackNextPage : undefined;
  }

  if (typeof meta.page === "number" && typeof meta.totalPages === "number") {
    return meta.page < meta.totalPages ? meta.page + 1 : undefined;
  }

  return fallbackNextPage;
}

export function usePosCatalogQueries(filters?: ProductQuery) {
  const staleTime = 60 * 1000;
  const productFilters = cleanQuery(filters ?? {});
  const baseProductFilters = { ...productFilters } as ProductQuery;
  delete baseProductFilters.page;

  const branches = useQuery({
    queryKey: keys.branches.all,
    queryFn: getBranches,
    staleTime,
  });

  const categories = useQuery({
    queryKey: keys.categories.all,
    queryFn: getCategories,
    staleTime,
  });

  const products = useInfiniteQuery({
    queryKey: [...keys.products.filters(), baseProductFilters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getProductSnippetsPage({
        ...baseProductFilters,
        page: Number(pageParam),
      }),
    getNextPageParam: (lastPage, allPages) => {
      // If the backend returns empty items, we've reached the end.
      if (!lastPage.items.length) return undefined;

      const fallbackNextPage = allPages.length + 1;
      return getNextPageFromMeta(lastPage.meta, fallbackNextPage);
    },
    staleTime,
  });

  return {
    branchList: branches.data ?? [],
    categoryList: categories.data ?? [],
    productList: products.data?.pages.flatMap((page) => page.items) ?? [],
    isPending: {
      branches: branches.isPending,
      categories: categories.isPending,
      products: products.isPending,
    },
    isFetchingNextPage: products.isFetchingNextPage,
    hasNextPage: products.hasNextPage,
    fetchNextPage: products.fetchNextPage,
    refetch: {
      branches: branches.refetch,
      categories: categories.refetch,
      products: products.refetch,
    },
  };
}
