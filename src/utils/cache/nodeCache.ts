interface CacheItem {
  value: any;
  expiry?: number;
}

class NodeCache {
  private cache: Map<string, CacheItem> = new Map();

  set(key: string, value: any, ttl?: number): void {
    const expiry = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

export const nodeCache = new NodeCache();

export class TokenCache {
  private cache: NodeCache;

  constructor(cache: NodeCache) {
    this.cache = cache;
  }

  async getAfribapayToken(key: string): Promise<string | null> {
    return this.cache.get(key);
  }

  async setAfribapayToken(
    key: string,
    value: string,
    ttl?: number
  ): Promise<void> {
    this.cache.set(key, value, ttl);
  }
}

export const tokenCache = new TokenCache(nodeCache);
