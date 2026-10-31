import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Thin wrapper for read-only public endpoints. */
export function usePublic<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: ["public", path],
    queryFn: ({ signal }) => api<T>(`/public${path}`, { signal }),
    enabled,
  });
}
