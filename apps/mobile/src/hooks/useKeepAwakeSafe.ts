// Ekranı uyanık tutar (mushaf okuma, kıble, zikirmatik) — kullanıcı okurken/
// pusulaya bakarken ekran kararmasın. expo-keep-awake expo paketiyle gömülü
// gelir; yine de native modül eksikse (beklenmez) no-op'a düşer, çökmez.
let impl: () => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const mod = require("expo-keep-awake") as { useKeepAwake?: () => void };
  if (typeof mod.useKeepAwake === "function") impl = mod.useKeepAwake;
} catch { /* no-op */ }

// Bileşen mount'ta ekranı uyanık tutar, unmount'ta bırakır.
export const useKeepAwakeSafe = impl;
