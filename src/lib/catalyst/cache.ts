const memoryCache = new Map<string, { value: any; expires: number }>();

export class CatalystCacheService {
  /**
   * Get cached object from Catalyst Cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  /**
   * Put key-value pair in Catalyst Cache (default TTL: 300 seconds)
   */
  static async put(key: string, value: any, ttlSeconds = 300): Promise<void> {
    memoryCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate cache entry
   */
  static async invalidate(key: string): Promise<void> {
    memoryCache.delete(key);
  }
}
