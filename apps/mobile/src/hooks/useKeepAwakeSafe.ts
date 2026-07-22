// Ekranı uyanık tutar (mushaf okuma, kıble, zikirmatik) — kullanıcı okurken/
// pusulaya bakarken ekran kararmasın. expo-keep-awake expo paketiyle gömülü
// gelir; yine de native modül eksikse (beklenmez) no-op'a düşer, çökmez.
type UseKeepAwake = (tag?: string, options?: { suppressDeactivateWarnings?: boolean }) => void;

let impl: UseKeepAwake = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const mod = require("expo-keep-awake") as { useKeepAwake?: UseKeepAwake };
  if (typeof mod.useKeepAwake === "function") impl = mod.useKeepAwake;
} catch { /* no-op */ }

// Activity yok olduktan sonra cleanup çalışırsa Expo'nun deactivate Promise'i
// reddedilebilir; bu beklenen yaşam döngüsü durumunu hook içinde yakala.
export function useKeepAwakeSafe(): void {
  impl(undefined, { suppressDeactivateWarnings: true });
}
