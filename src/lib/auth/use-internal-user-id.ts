"use client";

import { useEffect, useState } from "react";

let cachedUserId: string | null = null;
let inFlightPromise: Promise<string> | null = null;

export function clearInternalUserIdCache() {
  cachedUserId = null;
  inFlightPromise = null;
}

export function setCachedInternalUserId(id: string) {
  cachedUserId = id;
}

async function fetchInternalUserId(signal?: AbortSignal): Promise<string> {
  if (cachedUserId !== null) {
    return cachedUserId;
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        signal,
      });
      if (!res.ok) {
        return "";
      }
      const payload = await res.json().catch(() => null);
      const resolved = String(payload?.data?.userId || "").trim();
      cachedUserId = resolved;
      return resolved;
    } catch {
      return "";
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function useInternalUserId(isAuthenticated = true, isPending = false) {
  const [internalId, setInternalId] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Derived values for zero-latency instant hydration without cascading effect renders
  const resolvedUserId = !isAuthenticated ? "" : (cachedUserId ?? internalId);
  const isLoading = isPending || (isAuthenticated && cachedUserId === null && (isFetching || !internalId));

  useEffect(() => {
    if (isPending || !isAuthenticated || cachedUserId !== null) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    setIsFetching(true);

    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsFetching(false);
    }, 4000);

    fetchInternalUserId(abortController.signal)
      .then((resolvedId) => {
        if (!cancelled) {
          setInternalId(resolvedId);
        }
      })
      .catch(() => {
        if (!cancelled) setInternalId("");
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(safetyTimer);
          setIsFetching(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      abortController.abort();
    };
  }, [isAuthenticated, isPending]);

  return { userId: resolvedUserId, isLoading };
}
