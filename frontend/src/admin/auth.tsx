import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";

export interface Me {
  id: number;
  username: string;
  full_name: string;
  email: string;
  job_title: string;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
}

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api<Me>("/auth/me/");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  const me = query.data ?? null;

  const value: AuthCtx = {
    me,
    loading: query.isLoading,
    login: async (username, password) => {
      const user = await api<Me>("/auth/login/", { method: "POST", body: { username, password } });
      client.setQueryData(["auth", "me"], user);
    },
    logout: async () => {
      await api("/auth/logout/", { method: "POST" }).catch(() => undefined);
      client.clear();
      client.setQueryData(["auth", "me"], null);
    },
    can: (perm) => !!me && (me.is_superuser || me.permissions.includes(perm)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
