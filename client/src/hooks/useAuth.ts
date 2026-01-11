import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useEffect, useRef } from "react";

export function useAuth() {
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated - explicitly return null
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (was 0, causing constant refetches)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (was 0)
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Listen for auth-change events to refetch (debounced)
  useEffect(() => {
    const handleAuthChange = () => {
      // Debounce refetch to avoid multiple rapid calls
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      refetchTimeoutRef.current = setTimeout(() => {
        refetch();
      }, 100);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, [refetch]);

  // Explicitly check: user must exist and have an id to be authenticated
  const isAuthenticated = !!(user && user.id);

  return {
    user: user || null,
    isLoading,
    isAuthenticated,
    error,
  };
}
