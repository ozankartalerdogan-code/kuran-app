export type DiyanetAuthState = {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string | null;
  refreshExpiresAt: number | null;
};

export class DiyanetUpstreamError extends Error {
  status: number;

  constructor(status: number, message = "Diyanet istegi basarisiz") {
    super(message);
    this.name = "DiyanetUpstreamError";
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "https://awqatsalah.diyanet.gov.tr";
const ACCESS_TTL_SECONDS = 2700;
const REFRESH_TTL_SECONDS = 7 * 86400;
const EXPIRY_SAFETY_SECONDS = 300;
const REQUEST_TIMEOUT_MS = 10000;
// Diyanet yanıt vermezse (ağ/zaman aşımı, 429, 5xx) bu süre boyunca hiç gidilmez;
// aksi halde sıralı kuyrukta her istek 10 sn bekleyip birikir.
const COOLDOWN_SECONDS = 60;

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
}): { fetchDateRange(cityId: number, startYmd: string, endYmd: string): Promise<unknown[]> } {
  const baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  let memory: DiyanetAuthState | null = null;
  let tokenInFlight: Promise<DiyanetAuthState> | null = null;

  let tail: Promise<unknown> = Promise.resolve();
  let cooldownUntil = 0;

  function isTripStatus(status: number): boolean {
    return status === 0 || status === 429 || status >= 500;
  }

  function coolingDown(): boolean {
    return deps.now() < cooldownUntil;
  }

  function serialized<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function doFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await serialized(() => {
        // Kuyrukta beklerken devre açıldıysa Diyanet'e hiç gitme.
        if (coolingDown()) throw new DiyanetUpstreamError(0);
        return deps.fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      });
    } catch (error) {
      if (error instanceof DiyanetUpstreamError) throw error;
      cooldownUntil = deps.now() + COOLDOWN_SECONDS;
      throw new DiyanetUpstreamError(0);
    }
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
    if (coolingDown()) throw new DiyanetUpstreamError(0);
    try {
      return await fetchDateRangeOnce(cityId, startYmd, endYmd);
    } catch (error) {
      if (error instanceof DiyanetUpstreamError && isTripStatus(error.status)) {
        cooldownUntil = Math.max(cooldownUntil, deps.now() + COOLDOWN_SECONDS);
      }
      throw error;
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
