// Callback dönmese bile her deneme ve toplam süre sınırlıdır.
export function measureWithBudget<T>(options: {
  measure: () => Promise<T | null>; active: () => boolean;
  found: (value: T) => void; unavailable: () => void;
  attempts?: number; durationMs?: number; retryMs?: number; attemptMs?: number;
}) {
  let stopped = false, count = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let attempt: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { stopped = true; clearTimeout(retry); clearTimeout(attempt); clearTimeout(deadline); };
  const fail = () => { if (!stopped) { stop(); if (options.active()) options.unavailable(); } };
  const deadline = setTimeout(fail, options.durationMs ?? 3000);
  const run = () => {
    if (stopped) return;
    if (!options.active()) { stop(); return; }
    if (++count > (options.attempts ?? 10)) { fail(); return; }
    let settled = false;
    const finish = (value: T | null) => {
      if (stopped || settled) return;
      settled = true; clearTimeout(attempt);
      if (!options.active()) { stop(); return; }
      if (value !== null) { stop(); options.found(value); }
      else retry = setTimeout(run, options.retryMs ?? 180);
    };
    attempt = setTimeout(() => finish(null), options.attemptMs ?? 240);
    void Promise.resolve().then(() => stopped || !options.active() ? null : options.measure()).then(finish, () => finish(null));
  };
  run();
  return stop;
}
