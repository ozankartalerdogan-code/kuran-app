import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { AUDIO_BASE_URL } from "./runtimeConfig";

const AUDIO_BASE = AUDIO_BASE_URL;

export function harfSesUrl(harfId: number): string {
  return `${AUDIO_BASE}/audio/elifba/harf_${String(harfId).padStart(2, "0")}.mp3`;
}

let harfPlayer: AudioPlayer | null = null;
let cancelCurrent: (() => void) | null = null;
let audioModeSet = false;

function removePlayer(player: AudioPlayer): void {
  try { player.pause(); } catch { /* yoksay */ }
  try { player.remove(); } catch { /* yoksay */ }
}

export function stopHarfSes(): void {
  if (cancelCurrent) { cancelCurrent(); return; }
  if (!harfPlayer) return;
  const player = harfPlayer;
  harfPlayer = null;
  removePlayer(player);
}

export function playHarfSes(harfId: number, onError?: () => void, onPlayingChange?: (playing: boolean) => void): () => void {
  stopHarfSes();
  let cancelled = false;
  let sub: { remove(): void } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ownedPlayer: AudioPlayer | null = null;

  const cleanup = () => {
    // Doğal bitiş/hata da oynatmayı kapatır: eski cancel referansı sonradan yeni sesi etkilemesin.
    cancelled = true;
    if (timer) clearTimeout(timer);
    const s = sub;
    sub = null;
    try { s?.remove(); } catch { /* yoksay */ }
    if (ownedPlayer) {
      const player = ownedPlayer;
      ownedPlayer = null;
      if (harfPlayer === player) harfPlayer = null;
      removePlayer(player);
    }
    if (cancelCurrent === cancel) cancelCurrent = null;
  };
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    cleanup();
    onPlayingChange?.(false);
  };
  cancelCurrent = cancel;

  (async () => {
    try {
      if (!audioModeSet) {
        await setAudioModeAsync({ playsInSilentMode: true });
        audioModeSet = true;
      }
      if (cancelled) return;
      const player = createAudioPlayer(harfSesUrl(harfId));
      harfPlayer = player;
      ownedPlayer = player;

      // .play() ağ hatasında THROW ETMEZ; başarısızlık ya status.error ile gelir
      // ya da ses hiç yüklenmez (internet yok). İkisini de yakalayıp geri bildir.
      let done = false, ok = false;
      const fail = () => { if (!done && !cancelled) { done = true; cleanup(); onPlayingChange?.(false); onError?.(); } };
      sub = player.addListener("playbackStatusUpdate", (status) => {
        if (done || cancelled) return;
        if (status.isLoaded && status.playing) {
          ok = true;
          if (timer) clearTimeout(timer);
        }
        onPlayingChange?.(status.playing && !status.didJustFinish);
        if (status.didJustFinish) { done = true; cleanup(); }
        if (status.error) fail();
      });
      // 3 sn içinde yüklenip çalmadıysa (offline/askıda) başarısız say + listener temizle.
      // Soru değişip oynatma iptal edilirse bu timer da cancelled kontrolüyle no-op olur.
      timer = setTimeout(() => { if (!ok) fail(); }, 3000);

      player.play();
    } catch {
      if (!cancelled) { cleanup(); onPlayingChange?.(false); onError?.(); }
    }
  })();

  return cancel;
}
