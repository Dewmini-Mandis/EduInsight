import { useState, useEffect, useCallback, useRef } from "react";
import { queryClient, QueryKey } from "./queryClient";

export interface UseQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  enabled?: boolean;
  keepPreviousData?: boolean;
}

export function useQuery<T>(options: UseQueryOptions<T>) {
  const {
    queryKey,
    queryFn,
    staleTime = 300000,
    enabled = true,
    keepPreviousData = true,
  } = options;

  const keyString = queryClient.serializeKey(queryKey);
  const initialCached = enabled ? queryClient.getQueryData<T>(queryKey) : undefined;
  const initialStale = enabled ? queryClient.isStale(queryKey) : true;

  const [data, setData] = useState<T | undefined>(initialCached);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !initialCached);
  const [isFetching, setIsFetching] = useState<boolean>(enabled && initialStale);
  const [error, setError] = useState<Error | null>(null);

  const previousDataRef = useRef<T | undefined>(initialCached);

  const executeFetch = useCallback(
    async (force = false) => {
      if (!enabled) {
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      const cached = queryClient.getQueryData<T>(queryKey);
      const stale = queryClient.isStale(queryKey);

      if (cached !== undefined && !stale && !force) {
        setData(cached);
        previousDataRef.current = cached;
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      if (cached === undefined) {
        setIsLoading(true);
      }
      setIsFetching(true);
      setError(null);

      try {
        const freshData = await queryClient.fetchQuery(queryKey, queryFn, {
          staleTime,
          forceRefetch: force,
        });
        setData(freshData);
        previousDataRef.current = freshData;
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyString, enabled, staleTime]
  );

  useEffect(() => {
    executeFetch();

    const unsubscribe = queryClient.subscribe(() => {
      if (!enabled) return;
      const updated = queryClient.getQueryData<T>(queryKey);
      if (updated !== undefined) {
        setData(updated);
        previousDataRef.current = updated;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [keyString, enabled, executeFetch]);

  const refetch = useCallback(() => {
    return executeFetch(true);
  }, [executeFetch]);

  const activeData = data ?? (keepPreviousData ? previousDataRef.current : undefined);

  return {
    data: activeData,
    isLoading: isLoading && activeData === undefined,
    isFetching,
    error,
    refetch,
  };
}
