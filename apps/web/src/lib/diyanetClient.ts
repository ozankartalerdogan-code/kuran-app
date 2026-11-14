export type DiyanetAuthState = {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string | null;
  refreshExpiresAt: number | null;
};

export class DiyanetUpstreamError extends Error {
  status: number;
  /** Teşhis için kısa ayrıntı (ör. "TimeoutError", "ECONNRESET", "breaker"); kimlik bilgisi İÇERMEZ. */
  detail: string;

  constructor(status: number, message = "Diyanet istegi basarisiz", detail = "") {
    super(message);
    this.name = "DiyanetUpstreamError";
    this.status = status;
    this.detail = detail;
  }
}

function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const cause = (error as Error & { cause?: { code?: unknown } }).cause;
  const code = cause && typeof cause.code === "string" ? cause.code : "";
  return code ? `${error.name}:${code}` : error.name;
}

const DEFAULT_BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const ACCESS_TTL_SECONDS = 2700;
const REFRESH_TTL_SECONDS = 7 * 86400;
const EXPIRY_SAFETY_SECONDS = 300;
const REQUEST_TIMEOUT_MS = 10000;
// Diyanet yanıt vermezse (ağ/zaman aşımı, 429, 5xx) bu süre boyunca hiç gidilmez;
// aksi halde sıralı kuyrukta her istek 10 sn bekleyip birikir.
const COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_QUEUE = 10;

export type DiyanetSlotRelease = () => Promise<void> | void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createDiyanetClient(deps: {
  fetch: typeof fetch;
  now: () => number;
  credentials: () => { email: string; password: string } | null;
  loadAuth: () => Promise<DiyanetAuthState | null>;
  saveAuth: (s: DiyanetAuthState) => Promise<void>;
  baseUrl?: string;
  acquireSlot?: (
    cityId: number,
    startYmd: string,
    endYmd: string,
  ) => Promise<boolean | DiyanetSlotRelease>;
  maxQueue?: number;
  minIntervalMs?: number;
  nowMs?: () => number;
  sleep?: (ms: number) => Promise<void>;
}): { fetchDateRange(cityId: number, startYmd: string, endYmd: string): Promise<unknown[]> } {
  const baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const maxQueue = deps.maxQueue ?? DEFAULT_MAX_QUEUE;
  const minIntervalMs = deps.minIntervalMs ?? 0;
  const nowMs = deps.nowMs ?? (() => Date.now());
  const sleep =
    deps.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let memory: DiyanetAuthState | null = null;
  let tokenInFlight: Promise<DiyanetAuthState> | null = null;

  let tail: Promise<unknown> = Promise.resolve();
  let queued = 0;
  let lastFetchAtMs = 0;
  let cooldownUntil = 0;

  function isTripStatus(status: number): boolean {
    return status === 0 || status === 429 || status >= 500;
  }

  function isLocalThrottleDetail(detail: string): boolean {
    return detail === "breaker" || detail === "rate_limit" || detail === "queue_full";
  }

  function coolingDown(): boolean {
    return deps.now() < cooldownUntil;
  }

  function serialized<T>(task: () => Promise<T>): Promise<T> {
    if (queued >= maxQueue) {
      return Promise.reject(new DiyanetUpstreamError(429, undefined, "queue_full"));
    }
    queued += 1;
    const run = tail.then(task, task);
    tail = run.then(
      () => {
        queued -= 1;
      },
      () => {
        queued -= 1;
      },
    );
    return run;
  }

  async function doFetch(url: string, init: RequestInit): Promise<Response> {
    return serialized(async () => {
      // Kuyrukta beklerken devre açıldıysa Diyanet'e hiç gitme.
      if (coolingDown()) throw new DiyanetUpstreamError(0, undefined, "breaker");
      if (minIntervalMs > 0 && lastFetchAtMs > 0) {
        const waitMs = minIntervalMs - (nowMs() - lastFetchAtMs);
        if (waitMs > 0) {
          await sleep(waitMs);
          if (coolingDown()) throw new DiyanetUpstreamError(0, undefined, "breaker");
        }
      }
      lastFetchAtMs = nowMs();
      try {
        return await deps.fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      } catch (error) {
        if (error instanceof DiyanetUpstreamError) throw error;
        cooldownUntil = deps.now() + COOLDOWN_SECONDS;
        throw new DiyanetUpstreamError(0, undefined, errorDetail(error));
      }
    });
  }

  async function readJson(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      throw new DiyanetUpstreamError(res.status);
    }
  }

  function extractTokens(
    json: unknown,
    status: number,
  ): { accessToken: string; refreshToken: string | null } {
    if (!isRecord(json) || json.success !== true || !isRecord(json.data)) {
      throw new DiyanetUpstreamError(status);
    }
    const accessToken = json.data.accessToken;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new DiyanetUpstreamError(status);
    }
    const rawRefresh = json.data.refreshToken;
    const refreshToken =
      typeof rawRefresh === "string" && rawRefresh.length > 0 ? rawRefresh : null;
    return { accessToken, refreshToken };
  }

  async function persist(state: DiyanetAuthState): Promise<void> {
    memory = state;
    try {
      await deps.saveAuth(state);
    } catch {
      // Kalıcı yazma başarısız olsa da istek bellekteki tokenla sürer.
    }
  }

  async function login(): Promise<DiyanetAuthState> {
    const credentials = deps.credentials();
    if (!credentials) throw new DiyanetUpstreamError(0, "kimlik yok");

    const res = await doFetch(`${baseUrl}/Auth/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
    if (!res.ok) throw new DiyanetUpstreamError(res.status);

    const tokens = extractTokens(await readJson(res), res.status);
    const now = deps.now();
    return {
      accessToken: tokens.accessToken,
      accessExpiresAt: now + ACCESS_TTL_SECONDS,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: now + REFRESH_TTL_SECONDS,
    };
  }

  async function refresh(old: DiyanetAuthState): Promise<DiyanetAuthState> {
    if (!old.refreshToken) throw new DiyanetUpstreamError(0);

    const res = await doFetch(
      `${baseUrl}/Auth/RefreshToken/${encodeURIComponent(old.refreshToken)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${old.accessToken}` },
      },
    );
    if (!res.ok) throw new DiyanetUpstreamError(res.status);

    const tokens = extractTokens(await readJson(res), res.status);
    const now = deps.now();
    return {
      accessToken: tokens.accessToken,
      accessExpiresAt: now + ACCESS_TTL_SECONDS,
      refreshToken: tokens.refreshToken ?? old.refreshToken,
      refreshExpiresAt: now + REFRESH_TTL_SECONDS,
    };
  }

  function isFresh(state: DiyanetAuthState, now: number): boolean {
    return state.accessExpiresAt - EXPIRY_SAFETY_SECONDS > now;
  }

  function canRefresh(state: DiyanetAuthState, now: number): boolean {
    return (
      state.refreshToken !== null &&
      state.refreshExpiresAt !== null &&
      state.refreshExpiresAt > now
    );
  }

  async function acquireToken(): Promise<DiyanetAuthState> {
    const now = deps.now();
    if (memory && isFresh(memory, now)) return memory;

    let persisted: DiyanetAuthState | null = null;
    try {
      persisted = await deps.loadAuth();
    } catch {
      persisted = null;
    }

    if (persisted && isFresh(persisted, now)) {
      memory = persisted;
      return persisted;
    }

    if (persisted && canRefresh(persisted, now)) {
      try {
        const state = await refresh(persisted);
        await persist(state);
        return state;
      } catch {
        // Yenileme başarısız: login'e düş.
      }
    }

    const state = await login();
    await persist(state);
    return state;
  }

  async function acquireFreshToken(): Promise<DiyanetAuthState> {
    memory = null;

    let persisted: DiyanetAuthState | null = null;
    try {
      persisted = await deps.loadAuth();
    } catch {
      persisted = null;
    }

    if (persisted && canRefresh(persisted, deps.now())) {
      try {
        const state = await refresh(persisted);
        await persist(state);
        return state;
      } catch {
        // Yenileme başarısız: login'e düş.
      }
    }

    const state = await login();
    await persist(state);
    return state;
  }

  function startToken(force: boolean): Promise<DiyanetAuthState> {
    if (tokenInFlight) return tokenInFlight;
    const run = (force ? acquireFreshToken() : acquireToken()).finally(() => {
      if (tokenInFlight === run) tokenInFlight = null;
    });
    tokenInFlight = run;
    return run;
  }

  async function getToken(force = false): Promise<DiyanetAuthState> {
    if (!force) {
      if (memory && isFresh(memory, deps.now())) return memory;
      if (tokenInFlight) return tokenInFlight;
      return startToken(false);
    }

    if (tokenInFlight) {
      try {
        await tokenInFlight;
      } catch {
        // Yeni token alma denemesi aşağıda yapılır.
      }
    }
    return startToken(true);
  }

  async function requestDateRange(
    cityId: number,
    startYmd: string,
    endYmd: string,
    forceToken: boolean,
  ): Promise<Response> {
    const auth = await getToken(forceToken);
    return doFetch(`${baseUrl}/api/PrayerTime/DateRange`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cityId,
        startDate: `${startYmd}T00:00:00`,
        endDate: `${endYmd}T00:00:00`,
      }),
    });
  }

  async function fetchDateRange(
    cityId: number,
    startYmd: string,
    endYmd: string,
  ): Promise<unknown[]> {
    if (coolingDown()) throw new DiyanetUpstreamError(0, undefined, "breaker");
    if (queued >= maxQueue) throw new DiyanetUpstreamError(429, undefined, "queue_full");

    let releaseSlot: DiyanetSlotRelease | null = null;
    if (deps.acquireSlot) {
      const slot = await deps.acquireSlot(cityId, startYmd, endYmd);
      if (slot === false) {
        throw new DiyanetUpstreamError(429, undefined, "rate_limit");
      }
      if (typeof slot === "function") {
        releaseSlot = slot;
      }
    }

    try {
      return await fetchDateRangeOnce(cityId, startYmd, endYmd);
    } catch (error) {
      // Devre zaten açıkken veya hız/kuyruk sınırında reddedilen istekler süreyi UZATMAZ.
      if (
        error instanceof DiyanetUpstreamError &&
        !isLocalThrottleDetail(error.detail) &&
        isTripStatus(error.status)
      ) {
        cooldownUntil = Math.max(cooldownUntil, deps.now() + COOLDOWN_SECONDS);
      }
      throw error;
    } finally {
      if (releaseSlot) {
        try {
          await releaseSlot();
        } catch {
          // Kilit bırakma hatası yanıtı bozmaz.
        }
      }
    }
  }

  async function fetchDateRangeOnce(
    cityId: number,
    startYmd: string,
    endYmd: string,
  ): Promise<unknown[]> {
    let res = await requestDateRange(cityId, startYmd, endYmd, false);

    if (res.status === 401) {
      res = await requestDateRange(cityId, startYmd, endYmd, true);
    }

    if (!res.ok) throw new DiyanetUpstreamError(res.status);

    const json = await readJson(res);
    if (!isRecord(json) || json.success !== true || !Array.isArray(json.data)) {
      throw new DiyanetUpstreamError(res.status);
    }

    return json.data;
  }

  return { fetchDateRange };
}
