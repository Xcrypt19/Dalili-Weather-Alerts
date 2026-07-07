import { env, hasKey } from './env.js';

/**
 * Cache abstraction (SRS 10.2 — Redis layer).
 * Uses Redis when REDIS_URL is set, otherwise an in-memory Map with TTLs so the
 * app runs in development without Redis installed.
 */

let impl;

function memoryCache() {
  const store = new Map(); // key -> { value, expiresAt }
  const sweep = () => {
    const now = Date.now();
    for (const [k, v] of store) if (v.expiresAt && v.expiresAt < now) store.delete(k);
  };
  setInterval(sweep, 60_000).unref?.();

  return {
    kind: 'memory',
    async get(key) {
      const e = store.get(key);
      if (!e) return null;
      if (e.expiresAt && e.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return e.value;
    },
    async set(key, value, ttlSeconds) {
      store.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },
    async del(key) {
      store.delete(key);
    },
  };
}

async function redisCache(url) {
  // ioredis is an optional dependency; import lazily so a missing module
  // simply falls back to memory.
  // eslint-disable-next-line import/no-extraneous-dependencies
  const Redis = (await import('ioredis')).default;
  const client = new Redis(url);
  client.on('error', (e) => console.error('[cache] redis error', e.message));
  return {
    kind: 'redis',
    async get(key) {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    async set(key, value, ttlSeconds) {
      const raw = JSON.stringify(value);
      if (ttlSeconds) await client.set(key, raw, 'EX', ttlSeconds);
      else await client.set(key, raw);
    },
    async del(key) {
      await client.del(key);
    },
  };
}

async function build() {
  if (hasKey(env.redisUrl)) {
    try {
      const c = await redisCache(env.redisUrl);
      console.log('[cache] using Redis');
      return c;
    } catch (e) {
      console.warn('[cache] Redis unavailable, falling back to memory:', e.message);
    }
  }
  console.log('[cache] using in-memory cache');
  return memoryCache();
}

// top-level await is fine in an ES module
impl = await build();

export const cache = {
  get: (k) => impl.get(k),
  set: (k, v, ttl) => impl.set(k, v, ttl),
  del: (k) => impl.del(k),
  get kind() {
    return impl.kind;
  },
};
