"use client";

import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Client-side pagination for already-fetched lists. Pairs with
 * `useSearchFilter` — pass its `resetKey` (e.g. the search query) so the
 * page resets to 1 whenever the underlying result set changes shape.
 */
export function usePagination<T>(data: T[], opts?: { pageSize?: number; resetKey?: unknown }) {
  const pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [page, setPageState] = useState(1);

  // Adjust state during render (React's documented pattern for deriving
  // state from a changed prop) instead of an effect, avoiding an extra
  // render pass and a synchronous setState-in-effect.
  const [prevResetKey, setPrevResetKey] = useState(opts?.resetKey);
  if (opts?.resetKey !== prevResetKey) {
    setPrevResetKey(opts?.resetKey);
    if (page !== 1) setPageState(1);
  }

  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  function setPage(next: number) {
    setPageState(Math.min(Math.max(1, next), pageCount));
  }

  return { page: currentPage, setPage, pageCount, paged, total: data.length, pageSize };
}
