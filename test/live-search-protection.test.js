import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLiveSearchProtection,
  LiveSearchProtectionError,
} from "@/lib/live-search-protection";

class FakeRedis {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value, options = {}) {
    if (options.nx && this.values.has(key)) {
      return null;
    }
    this.values.set(key, value);
    return "OK";
  }

  async incr(key) {
    const next = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, next);
    return next;
  }

  async expire() {
    return 1;
  }

  async eval(script, keys, args) {
    const [key] = keys;

    if (script.includes("local current")) {
      const current = Number(this.values.get(key) ?? 0);
      const limit = Number(args[0]);
      if (current >= limit) {
        return [0, current];
      }
      const next = current + 1;
      this.values.set(key, next);
      return [1, next];
    }

    if (this.values.get(key) === args[0]) {
      this.values.delete(key);
      return 1;
    }
    return 0;
  }
}

function request(ip = "203.0.113.10") {
  return new Request("https://localeco.example/api/search", {
    headers: { "x-forwarded-for": ip },
  });
}

function response(query = "bamboo toothbrush") {
  return {
    query,
    location: "Hyderabad, Telangana, India",
    status: "complete",
    analysisMessage: null,
    isMock: false,
    products: [{ id: "one" }],
  };
}

describe("live search protection", () => {
  beforeEach(() => {
    process.env.LIVE_SEARCH_ENABLED = "true";
    process.env.LIVE_SEARCH_PER_IP_MINUTE = "2";
    process.env.LIVE_SEARCH_PER_IP_DAILY = "10";
    process.env.LIVE_SEARCH_GLOBAL_MINUTE = "4";
    process.env.LIVE_SEARCH_DAILY_BUDGET = "20";
    process.env.LIVE_SEARCH_LIFETIME_BUDGET = "50";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("LIVE_SEARCH_")) {
        delete process.env[name];
      }
    }
  });

  it("shares a cached result without executing providers again", async () => {
    const redis = new FakeRedis();
    const execute = vi.fn().mockResolvedValue(response());
    const protect = createLiveSearchProtection({ redis });
    const input = {
      request: request(),
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      execute,
    };

    const first = await protect(input);
    const second = await protect(input);

    expect(first.cacheStatus).toBe("miss");
    expect(second.cacheStatus).toBe("hit");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("blocks a visitor after two requests in the same minute", async () => {
    const redis = new FakeRedis();
    const protect = createLiveSearchProtection({ redis });

    await protect({
      request: request(),
      query: "query one",
      location: "Hyderabad, Telangana, India",
      execute: () => response("query one"),
    });
    await protect({
      request: request(),
      query: "query two",
      location: "Hyderabad, Telangana, India",
      execute: () => response("query two"),
    });

    await expect(
      protect({
        request: request(),
        query: "query three",
        location: "Hyderabad, Telangana, India",
        execute: () => response("query three"),
      }),
    ).rejects.toMatchObject({
      code: "VISITOR_MINUTE_LIMIT",
      status: 429,
    });
  });

  it("enforces the hard lifetime provider budget", async () => {
    process.env.LIVE_SEARCH_LIFETIME_BUDGET = "1";
    const redis = new FakeRedis();
    const protect = createLiveSearchProtection({ redis });

    await protect({
      request: request("203.0.113.10"),
      query: "query one",
      location: "Hyderabad, Telangana, India",
      execute: () => response("query one"),
    });

    await expect(
      protect({
        request: request("203.0.113.11"),
        query: "query two",
        location: "Hyderabad, Telangana, India",
        execute: () => response("query two"),
      }),
    ).rejects.toMatchObject({
      code: "LIVE_BUDGET_EXHAUSTED",
    });
  });

  it("fails closed when durable protection is unavailable", async () => {
    const redis = new FakeRedis();
    redis.incr = vi.fn().mockRejectedValue(new Error("Redis unavailable"));
    const protect = createLiveSearchProtection({ redis });

    await expect(
      protect({
        request: request(),
        query: "bamboo toothbrush",
        location: "Hyderabad, Telangana, India",
        execute: () => response(),
      }),
    ).rejects.toBeInstanceOf(LiveSearchProtectionError);
  });

  it("does not run providers while live search is disabled", async () => {
    process.env.LIVE_SEARCH_ENABLED = "false";
    const execute = vi.fn();
    const protect = createLiveSearchProtection({ redis: new FakeRedis() });

    await expect(
      protect({
        request: request(),
        query: "bamboo toothbrush",
        location: "Hyderabad, Telangana, India",
        execute,
      }),
    ).rejects.toMatchObject({ code: "LIVE_SEARCH_DISABLED" });
    expect(execute).not.toHaveBeenCalled();
  });
});
