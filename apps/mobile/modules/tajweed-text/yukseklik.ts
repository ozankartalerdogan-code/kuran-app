// Native tecvid metninin yükseklik defteri — saf mantık, testten doğrudan
// çalıştırılabilsin diye JSX içeren index.tsx'ten ayrı tutulur.

/**
 * Ölçülen yüksekliğin bağlı olduğu TÜM girdiler. Hem native view'ın remount
 * `key`'i hem de yükseklik cache anahtarı budur; ikisi ayrışırsa bir metnin
 * yüksekliği başka bir metne uygulanabilir.
 */
export function yukseklikAnahtari(input: {
  genislik: number;
  fontSize?: number;
  lineHeight?: number;
  text: string;
}): string {
  return `${input.genislik}:${input.fontSize ?? ""}:${input.lineHeight ?? ""}:${input.text}`;
}

export type OlculenYukseklik = { key: string; yukseklik: number } | null;

/** Anahtar değiştiyse saklanan ölçüm taşınmaz; o anahtarın bilinen değerine düşülür. */
export function gecerliYukseklik(
  olculen: OlculenYukseklik,
  cacheKey: string,
  cache: Map<string, number>,
  varsayilan = 10,
): number {
  if (olculen && olculen.key === cacheKey) return olculen.yukseklik;
  return cache.get(cacheKey) ?? varsayilan;
}
