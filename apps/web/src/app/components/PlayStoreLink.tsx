const PLAY_STORE_URLS = {
  footer:
    "https://play.google.com/store/apps/details?id=com.kuranapp.mobile&referrer=utm_source%3Dweb%26utm_medium%3Dfooter",
  ayah_banner:
    "https://play.google.com/store/apps/details?id=com.kuranapp.mobile&referrer=utm_source%3Dweb%26utm_medium%3Dayah_banner",
} as const;

export function PlayStoreLink({
  medium,
  variant = "footer",
}: {
  medium: "footer" | "ayah_banner";
  variant?: "footer" | "card";
}) {
  const href = PLAY_STORE_URLS[medium];

  if (variant === "footer") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-800 bg-navy-900/60 px-4 py-3">
        <div className="text-xs">
          <p className="font-semibold text-white">Kuran Yolu Android uygulaması</p>
          <p className="mt-1 leading-relaxed text-navy-300">
            Mushaf internetsiz, reklamsız. Google Play&apos;den ücretsiz indirin.
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-navy-950 transition-colors hover:bg-gold-400"
        >
          Google Play&apos;de aç
        </a>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="font-display text-lg font-semibold text-navy-900 dark:text-stone-50">
        Kuran Yolu Android uygulaması
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
        Mushaf internetsiz, reklamsız. Google Play&apos;den ücretsiz indirin.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className="mt-4 inline-flex min-h-9 items-center rounded-xl bg-navy-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-700 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400"
      >
        Google Play&apos;de aç
      </a>
    </section>
  );
}
