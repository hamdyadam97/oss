import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";

export function useSettings() {
  return useQuery({
    queryKey: ["public", "settings"],
    queryFn: () => api<SiteSettings>("/public/settings/"),
    staleTime: 5 * 60 * 1000,
  });
}
