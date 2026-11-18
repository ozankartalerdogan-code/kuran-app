type CityPickerDeps<T> = {
  save(city: T): Promise<void>;
  warm(city: T, isCurrent: () => boolean): Promise<void>;
  complete(city: T): void;
  onError(): void;
  onSettled(): void;
};

/** Serialize storage writes; only the latest pick may publish async results. */
export function createLatestCityPicker<T>(deps: CityPickerDeps<T>) {
  let sequence = 0;
  let saves: Promise<void> = Promise.resolve();
  return async (city: T): Promise<void> => {
    const token = ++sequence;
    const isCurrent = () => token === sequence;
    const saved = saves.then(async () => {
      if (isCurrent()) await deps.save(city);
    });
    saves = saved.catch(() => {});
    try {
      await saved;
      if (!isCurrent()) return;
      // Ekran eskisi gibi kayıt biter bitmez kapanır; ön ısıtma arka planda sürer
      // (depo singleflight'ı bildirim yeniden planlamasıyla aynı isteği paylaştırır).
      void deps.warm(city, isCurrent).catch(() => {});
      deps.complete(city);
    } catch {
      if (isCurrent()) deps.onError();
    } finally {
      if (isCurrent()) deps.onSettled();
    }
  };
}
