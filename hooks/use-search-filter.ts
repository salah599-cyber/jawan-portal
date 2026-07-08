"use client";

import { useMemo, useState } from "react";

/**
 * Client-side free-text filter for already-fetched lists. Suited for the
 * moderate row counts these list pages currently render; if a module's data
 * volume grows enough to need server-side pagination, this is the place to
 * swap in query-param-driven fetching.
 */
export function useSearchFilter<T>(data: T[], getSearchText: (item: T) => string) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [data, query, getSearchText]);

  return { query, setQuery, filtered };
}
