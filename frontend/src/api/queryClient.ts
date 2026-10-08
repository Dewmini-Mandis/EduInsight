export type QueryKey = (string | number | boolean | null | undefined)[];

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  staleTime: number;
}

export interface FetchQueryOptions {
  staleTime?: number;
  forceRefetch?: boolean;
}

class QueryClient {
  private cache = new Map<string, CacheEntry>();
  private inFlightPromises = new Map<string, Promise<any>>();
  private listeners = new Set<() => void>();

  public serializeKey(key: QueryKey): string {
    return JSON.stringify(key);
  }

  public getQueryData<T>(key: QueryKey): T | undefined {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (!entry) return undefined;
    return entry.data as T;
  }

  public isStale(key: QueryKey): boolean {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.staleTime;
  }

  public setQueryData<T>(key: QueryKey, data: T, staleTime = 300000): void {
    const serialized = this.serializeKey(key);
    this.cache.set(serialized, {
      data,
      timestamp: Date.now(),
      staleTime,
    });
    this.notifyListeners();
  }

  public async fetchQuery<T>(
    key: QueryKey,
    queryFn: () => Promise<T>,
    options?: FetchQueryOptions
  ): Promise<T> {
    const serialized = this.serializeKey(key);
    const staleTime = options?.staleTime ?? 300000; // default 5 min

    if (!options?.forceRefetch && !this.isStale(key)) {
      const entry = this.cache.get(serialized);
      if (entry) {
        return entry.data as T;
      }
    }

    if (this.inFlightPromises.has(serialized)) {
      return this.inFlightPromises.get(serialized) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const data = await queryFn();
        this.setQueryData(key, data, staleTime);
        return data;
      } finally {
        this.inFlightPromises.delete(serialized);
      }
    })();

    this.inFlightPromises.set(serialized, promise);
    return promise;
  }

  public prefetchQuery<T>(
    key: QueryKey,
    queryFn: () => Promise<T>,
    staleTime = 300000
  ): void {
    if (this.isStale(key)) {
      this.fetchQuery(key, queryFn, { staleTime }).catch(() => {
        // Silence prefetch errors
      });
    }
  }

  public invalidateQueries(keyPattern: QueryKey): void {
    const patternStr = JSON.stringify(keyPattern);
    const prefix = patternStr.substring(0, patternStr.length - 1); // e.g. ["teacher","quizzes" -> matches ["teacher","quizzes", ...]

    this.cache.forEach((entry, k) => {
      if (k === patternStr || k.startsWith(prefix)) {
        entry.timestamp = 0; // Mark stale
      }
    });
    this.notifyListeners();
  }

  public clear(): void {
    this.cache.clear();
    this.inFlightPromises.clear();
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error("QueryClient listener error:", e);
      }
    });
  }
}

export const queryClient = new QueryClient();
