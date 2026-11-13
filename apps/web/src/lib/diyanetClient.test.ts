import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDiyanetClient,
  DiyanetUpstreamError,
  type DiyanetAuthState,
} from "./diyanetClient.ts";

type FakeCall = { url: string; init: RequestInit | undefined };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authBody(accessToken: string, refreshToken: string | null = "refresh-1") {
  return { success: true, data: { accessToken, refreshToken } };
}

function dateRangeBody() {
  return { success: true, data: [{ gregorianDateShort: "1.12.2026" }] };
}

function createFetch(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
  delayMs = 0,
) {
  const calls: FakeCall[] = [];
  let open = 0;
  let maxOpen = 0;

  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init });
    open += 1;
    if (open > maxOpen) maxOpen = open;
    try {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return await handler(url, init);
    } finally {
      open -= 1;
    }
  };

  return {
    fn: fn as typeof fetch,
    calls,
    maxOpen: () => maxOpen,
    count: (needle: string) => calls.filter((call) => call.url.includes(needle)).length,
  };
}

function authState(overrides: Partial<DiyanetAuthState> = {}): DiyanetAuthState {
  const now = 1_800_000_000;
  return {
    accessToken: "saved-access",
    accessExpiresAt: now + 2000,
    refreshToken: null,
    refreshExpiresAt: null,
    ...overrides,
  };
}

test("ilk cagri login + DateRange; ikinci cagri login yapmaz", async () => {
  const fake = createFetch((url) => {
    if (url.includes("/Auth/Login")) return jsonResponse(authBody("access-1"));
    if (url.includes("/api/PrayerTime/DateRange")) return jsonResponse(dateRangeBody());
    return jsonResponse({}, 404);
  });

  const now = 1_800_000_000;
  const saved: DiyanetAuthState[] = [];
  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => now,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => null,
    saveAuth: async (state) => {
      saved.push(state);
    },
    baseUrl: "https://example.test",
  });

  const first = await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");
  assert.equal(first.length, 1);
  assert.equal(fake.calls[0]?.url, "https://example.test/Auth/Login");
  assert.equal(fake.calls[1]?.url, "https://example.test/api/PrayerTime/DateRange");

  const body = JSON.parse(String(fake.calls[1]?.init?.body));
  assert.deepEqual(body, {
    cityId: 11002,
    startDate: "2026-12-01T00:00:00",
    endDate: "2026-12-31T00:00:00",
  });

  const headers = fake.calls[1]?.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer access-1");
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.accessExpiresAt, now + 2700);
  assert.equal(saved[0]?.refreshExpiresAt, now + 7 * 86400);

  await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");
  assert.equal(fake.count("/Auth/Login"), 1);
  assert.equal(fake.count("/api/PrayerTime/DateRange"), 2);
});

test("loadAuth gecerli token verirse login yapilmaz", async () => {
  const fake = createFetch(() => jsonResponse(dateRangeBody()));

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => authState({ accessToken: "kayitli-access" }),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");

  assert.equal(fake.count("/Auth/Login"), 0);
  assert.equal(fake.count("/Auth/RefreshToken"), 0);
  assert.equal(fake.count("/api/PrayerTime/DateRange"), 1);
  const headers = fake.calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer kayitli-access");
});

test("suresi dolmus access + gecerli refresh -> RefreshToken cagrilir", async () => {
  const fake = createFetch((url) => {
    if (url.includes("/Auth/RefreshToken/refresh-old")) {
      return jsonResponse(authBody("access-new", "refresh-new"));
    }
    if (url.includes("/api/PrayerTime/DateRange")) return jsonResponse(dateRangeBody());
    return jsonResponse({}, 404);
  });

  const saved: DiyanetAuthState[] = [];
  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () =>
      authState({
        accessToken: "access-old",
        accessExpiresAt: 1_800_000_000 - 10,
        refreshToken: "refresh-old",
        refreshExpiresAt: 1_800_000_000 + 1000,
      }),
    saveAuth: async (state) => {
      saved.push(state);
    },
    baseUrl: "https://example.test",
  });

  await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");

  assert.equal(fake.count("/Auth/RefreshToken/refresh-old"), 1);
  assert.equal(fake.count("/Auth/Login"), 0);
  const refreshHeaders = fake.calls[0]?.init?.headers as Record<string, string>;
  assert.equal(refreshHeaders.Authorization, "Bearer access-old");
  assert.equal(saved[0]?.accessToken, "access-new");
  assert.equal(saved[0]?.refreshToken, "refresh-new");
});

test("refresh basarisiz olursa login'e dusulur", async () => {
  const fake = createFetch((url) => {
    if (url.includes("/Auth/RefreshToken/")) return jsonResponse({}, 401);
    if (url.includes("/Auth/Login")) return jsonResponse(authBody("access-login"));
    if (url.includes("/api/PrayerTime/DateRange")) return jsonResponse(dateRangeBody());
    return jsonResponse({}, 404);
  });

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () =>
      authState({
        accessToken: "access-old",
        accessExpiresAt: 1_800_000_000 - 10,
        refreshToken: "refresh-old",
        refreshExpiresAt: 1_800_000_000 + 1000,
      }),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");

  assert.equal(fake.count("/Auth/RefreshToken/"), 1);
  assert.equal(fake.count("/Auth/Login"), 1);
  assert.equal(fake.count("/api/PrayerTime/DateRange"), 1);
});

test("DateRange 401 donerse bir kez yeniden token alinip tekrar denenir", async () => {
  let dateRangeCalls = 0;
  const fake = createFetch((url) => {
    if (url.includes("/Auth/Login")) return jsonResponse(authBody("access-new"));
    if (url.includes("/api/PrayerTime/DateRange")) {
      dateRangeCalls += 1;
      return dateRangeCalls === 1 ? jsonResponse({}, 401) : jsonResponse(dateRangeBody());
    }
    return jsonResponse({}, 404);
  });

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => authState({ accessToken: "stale-access" }),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  const data = await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");

  assert.equal(data.length, 1);
  assert.equal(dateRangeCalls, 2);
  assert.equal(fake.count("/Auth/Login"), 1);
  const retryHeaders = fake.calls[fake.calls.length - 1]?.init?.headers as Record<string, string>;
  assert.equal(retryHeaders.Authorization, "Bearer access-new");
});

test("429 -> DiyanetUpstreamError status 429", async () => {
  const fake = createFetch(() => new Response("", { status: 429 }));

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => authState(),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await assert.rejects(
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    (error: unknown) => error instanceof DiyanetUpstreamError && error.status === 429,
  );
});

test("esazamanli 3 cagri tek login paylasir ve istekler siralidir", async () => {
  let logins = 0;
  const fake = createFetch((url) => {
    if (url.includes("/Auth/Login")) {
      logins += 1;
      return jsonResponse(authBody("access-1"));
    }
    if (url.includes("/api/PrayerTime/DateRange")) return jsonResponse(dateRangeBody());
    return jsonResponse({}, 404);
  }, 5);

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => null,
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  const results = await Promise.all([
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
  ]);

  assert.equal(results.length, 3);
  assert.equal(logins, 1);
  assert.equal(fake.count("/Auth/Login"), 1);
  assert.equal(fake.count("/api/PrayerTime/DateRange"), 3);
  assert.equal(fake.maxOpen(), 1);
});

test("kimlik yoksa status 0 hata verir", async () => {
  const fake = createFetch(() => jsonResponse(dateRangeBody()));

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => null,
    loadAuth: async () => null,
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await assert.rejects(
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    (error: unknown) => error instanceof DiyanetUpstreamError && error.status === 0,
  );
  assert.equal(fake.calls.length, 0);
});

test("hata mesajinda sifre gecmez", async () => {
  const fake = createFetch((url) => {
    if (url.includes("/Auth/Login")) return jsonResponse({}, 401);
    return jsonResponse({}, 404);
  });

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici@example.test", password: "cok-gizli-sifre" }),
    loadAuth: async () => null,
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await assert.rejects(
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    (error: unknown) =>
      error instanceof DiyanetUpstreamError &&
      !error.message.includes("cok-gizli-sifre") &&
      !error.message.includes("kullanici@example.test"),
  );
});

test("fetch firlatirsa status 0 hata verir", async () => {
  const fake = createFetch(() => {
    throw new Error("ag hatasi");
  });

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => authState(),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await assert.rejects(
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    (error: unknown) => error instanceof DiyanetUpstreamError && error.status === 0,
  );
});

test("Diyanet yanit vermezse 60 sn boyunca hic gidilmez, sonra yeniden denenir", async () => {
  let now = 1_800_000_000;
  let fail = true;
  const fake = createFetch((url) => {
    if (fail) throw new Error("zaman asimi");
    if (url.includes("/Auth/Login")) return jsonResponse(authBody("access-1"));
    return jsonResponse(dateRangeBody());
  });

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => now,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => null,
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  await assert.rejects(client.fetchDateRange(11002, "2026-12-01", "2026-12-31"));
  const callsAfterFirst = fake.calls.length;
  assert.ok(callsAfterFirst >= 1);

  now += 30;
  await assert.rejects(
    client.fetchDateRange(11002, "2026-12-01", "2026-12-31"),
    (error: unknown) => error instanceof DiyanetUpstreamError && error.status === 0,
  );
  assert.equal(fake.calls.length, callsAfterFirst, "devre acikken istek atilmamali");

  now += 31;
  fail = false;
  const data = await client.fetchDateRange(11002, "2026-12-01", "2026-12-31");
  assert.equal(data.length, 1);
});

test("kuyrukta bekleyen istekler devre acilinca Diyanet'e gitmez", async () => {
  const fake = createFetch(() => {
    throw new Error("zaman asimi");
  }, 5);

  const client = createDiyanetClient({
    fetch: fake.fn,
    now: () => 1_800_000_000,
    credentials: () => ({ email: "kullanici", password: "gizli-sifre" }),
    loadAuth: async () => authState(),
    saveAuth: async () => undefined,
    baseUrl: "https://example.test",
  });

  const results = await Promise.allSettled([
    client.fetchDateRange(1, "2026-12-01", "2026-12-31"),
    client.fetchDateRange(2, "2026-12-01", "2026-12-31"),
    client.fetchDateRange(3, "2026-12-01", "2026-12-31"),
  ]);
  assert.ok(results.every((r) => r.status === "rejected"));
  assert.equal(fake.calls.length, 1);
});
