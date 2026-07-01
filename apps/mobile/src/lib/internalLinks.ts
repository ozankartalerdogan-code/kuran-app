/**
 * internalLinks.ts — ders içeriğinden uygulama-içi ekranlara yönlendirme.
 *
 * Ders metnine elle konan {{link:KEY|görünen metin}} token'ları burada tanımlı
 * KEY → route eşlemesiyle tıklanabilir linke çevrilir (AyahLinkedText render eder).
 * Bilinmeyen KEY → düz metin (bozuk link sızmaz). Yeni yönlendirme = buraya 1 satır.
 *
 * NOT: hedef ekran, derin link için gerekiyorsa parametre okumalı (ör. namaz-rehberi
 * ?bolum=zamm → ilgili akordiyonu açıp oraya kaydırır).
 */
export const INTERNAL_LINKS: Record<string, string> = {
  "zamm-sureler": "/namaz-rehberi?bolum=zamm",
};

export function resolveInternalLink(key: string): string | null {
  return INTERNAL_LINKS[key] ?? null;
}

export type TokenPart =
  | { type: "text"; value: string }
  | { type: "link"; key: string; label: string };

// {{link:key|görünen metin}} — key: kebab-case, label: } içermeyen serbest metin
const TOKEN_RE = /\{\{link:([a-z0-9-]+)\|([^}]+)\}\}/g;

export function splitInternalTokens(text: string): TokenPart[] {
  if (!text) return [{ type: "text", value: text ?? "" }];
  const out: TokenPart[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "link", key: m[1], label: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.length ? out : [{ type: "text", value: text }];
}
