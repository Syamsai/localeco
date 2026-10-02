import { createHmac, randomUUID } from "node:crypto";

import { Redis } from "@upstash/redis";

const KEY_PREFIX = "localeco:v1";
const DEFAULT_CACHE_TTL_SECONDS = 86400;
const PARTIAL_CACHE_TTL_SECONDS = 3600;
const LOCK_TTL_SECONDS = 45;
const LOCK_WAIT_MS = 20000;
const LOCK_POLL_MS = 250;

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const RESERVE_BUDGET_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
if current >= limit then
  return {0, current}
end
local next = redis.call("INCR", KEYS[1])
return {1, next}
`;

let redisClient;

export class LiveSearchProtectionError extends Error {
  constructor(message, code, status = 503) {
    super(message);
    this.name = "LiveSearchProtectionError";
    this.code = code;
    this.status = status;
  }
}

function readInteger(name, fallback, { min = 1, max = 100000 } = {}) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : fallback;
}

function getConfig() {
  return {
    visitorPerMinute: readInteger("LIVE_SEARCH_PER_IP_MINUTE", 2, {
      max: 10,
    }),
    visitorPerDay: readInteger("LIVE_SEARCH_PER_IP_DAILY", 10, { max: 100 }),
    globalPerMinute: readInteger("LIVE_SEARCH_GLOBAL_MINUTE", 4, { max: 4 }),
    globalPerDay: readInteger("LIVE_SEARCH_DAILY_BUDGET", 20, { max: 100 }),
    lifetimeBudget: readInteger("LIVE_SEARCH_LIFETIME_BUDGET", 50, {
      max: 250,
    }),
    cacheTtlSeconds: readInteger(
      "LIVE_SEARCH_CACHE_TTL_SECONDS",
      DEFAULT_CACHE_TTL_SECONDS,
      { min: 300, max: 604800 },
    ),
  };
}

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new LiveSearchProtectionError(
      "Live search protection is not configured.",
      "LIVE_PROTECTION_NOT_CONFIGURED",
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function hash(value) {
  const secret =
    process.env.LIVE_SEARCH_HASH_SECRET ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "localeco-nonproduction";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function getVisitorId(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return hash(address);
}

function searchKey(query, location) {
  const normalized = `${location.trim().toLowerCase().replace(/\s+/g, " ")}:${query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}`;
  return hash(normalized);
}

function minuteBucket(now) {
  return Math.floor(now / 60000);
}

function dayBucket(now) {
  return new Date(now).toISOString().slice(0, 10);
}

async function incrementWindow(redis, key, ttlSeconds) {
  const count = await redis.incr(key);
  await redis.expire(key, ttlSeconds);
  return count;
}

async function enforceWindow(redis, key, limit, ttlSeconds, message, code) {
  const count = await incrementWindow(redis, key, ttlSeconds);

  if (count > limit) {
    throw new LiveSearchProtectionError(message, code, 429);
  }

  return count;
}

async function waitForCachedResult(redis, cacheKey, sleep) {
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(LOCK_POLL_MS);
    const cached = await redis.get(cacheKey);
    if (cached) {
      return { ...cached, cacheStatus: "hit" };
    }
  }

  throw new LiveSearchProtectionError(
    "This search is already being processed. Please try again shortly.",
    "SEARCH_IN_PROGRESS",
    503,
  );
}

async function reserveLifetimeBudget(redis, limit) {
  const result = await redis.eval(RESERVE_BUDGET_SCRIPT, [
    `${KEY_PREFIX}:provider:lifetime`,
  ], [limit]);
  const [allowed, used] = Array.isArray(result) ? result.map(Number) : [0, limit];

  if (allowed !== 1) {
    throw new LiveSearchProtectionError(
      "The live search credit budget has been reached.",
      "LIVE_BUDGET_EXHAUSTED",
      503,
    );
  }

  return used;
}

async function releaseLock(redis, lockKey, lockToken) {
  try {
    await redis.eval(RELEASE_LOCK_SCRIPT, [lockKey], [lockToken]);
  } catch (error) {
    console.error("Live search lock release failed", {
      message: error instanceof Error ? error.message : "Unknown Redis error",
    });
  }
}

function cacheTtlFor(response, configuredTtl) {
  return response.status === "complete"
    ? configuredTtl
    : PARTIAL_CACHE_TTL_SECONDS;
}

export function createLiveSearchProtection({
  redis,
  now = () => Date.now(),
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  return async function protectLiveSearch({
    request,
    query,
    location,
    execute,
  }) {
    if (process.env.LIVE_SEARCH_ENABLED !== "true") {
      throw new LiveSearchProtectionError(
        "Live search is currently disabled.",
        "LIVE_SEARCH_DISABLED",
      );
    }

    const client = redis ?? getRedisClient();
    const config = getConfig();
    const timestamp = now();
    const visitorId = getVisitorId(request);

    try {
      await enforceWindow(
        client,
        `${KEY_PREFIX}:visitor:${visitorId}:minute:${minuteBucket(timestamp)}`,
        config.visitorPerMinute,
        120,
        "Too many searches. Please wait a minute and try again.",
        "VISITOR_MINUTE_LIMIT",
      );
      await enforceWindow(
        client,
        `${KEY_PREFIX}:visitor:${visitorId}:day:${dayBucket(timestamp)}`,
        config.visitorPerDay,
        172800,
        "Your live search limit for today has been reached.",
        "VISITOR_DAILY_LIMIT",
      );

      const key = searchKey(query, location);
      const cacheKey = `${KEY_PREFIX}:search:${key}`;
      const cached = await client.get(cacheKey);
      if (cached) {
        return { ...cached, cacheStatus: "hit" };
      }

      const lockKey = `${KEY_PREFIX}:lock:${key}`;
      const lockToken = randomUUID();
      const lockAcquired = await client.set(lockKey, lockToken, {
        nx: true,
        ex: LOCK_TTL_SECONDS,
      });

      if (lockAcquired !== "OK") {
        return waitForCachedResult(client, cacheKey, sleep);
      }

      try {
        const cacheAfterLock = await client.get(cacheKey);
        if (cacheAfterLock) {
          return { ...cacheAfterLock, cacheStatus: "hit" };
        }

        await enforceWindow(
          client,
          `${KEY_PREFIX}:provider:minute:${minuteBucket(timestamp)}`,
          config.globalPerMinute,
          120,
          "Live search is busy. Please wait a minute and try again.",
          "GLOBAL_MINUTE_LIMIT",
        );
        await enforceWindow(
          client,
          `${KEY_PREFIX}:provider:day:${dayBucket(timestamp)}`,
          config.globalPerDay,
          172800,
          "The live search limit for today has been reached.",
          "GLOBAL_DAILY_LIMIT",
        );
        const lifetimeUsed = await reserveLifetimeBudget(
          client,
          config.lifetimeBudget,
        );
        const response = await execute({ lifetimeUsed });

        await client.set(cacheKey, response, {
          ex: cacheTtlFor(response, config.cacheTtlSeconds),
        });
        return { ...response, cacheStatus: "miss" };
      } finally {
        await releaseLock(client, lockKey, lockToken);
      }
    } catch (error) {
      if (error instanceof LiveSearchProtectionError) {
        throw error;
      }

      console.error("Live search protection failed closed", {
        message: error instanceof Error ? error.message : "Unknown Redis error",
      });
      throw new LiveSearchProtectionError(
        "Live search protection is temporarily unavailable.",
        "LIVE_PROTECTION_UNAVAILABLE",
      );
    }
  };
}

export const executeProtectedLiveSearch = createLiveSearchProtection();
