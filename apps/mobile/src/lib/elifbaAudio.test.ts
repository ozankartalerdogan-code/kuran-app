import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadModule } from "../../test-support/loadModule.ts";

function loadAudio() {
  let removed = 0;
  let unsubscribed = 0;
  const listeners: ((s: Record<string, unknown>) => void)[] = [];
  const urls: string[] = [];
  const audio = loadModule<typeof import("./elifbaAudio")>(fileURLToPath(new URL("./elifbaAudio.ts", import.meta.url)), {
    "./runtimeConfig": { AUDIO_BASE_URL: "https://audio.invalid" },
    "expo-audio": {
      setAudioModeAsync: async () => {},
      createAudioPlayer: (url: string) => { urls.push(url); return ({
        play: () => {}, pause: () => {},
        remove: () => { removed++; },
        addListener: (_e: string, cb: (s: Record<string, unknown>) => void) => { listeners.push(cb); return { remove: () => { unsubscribed++; throw new Error("already removed"); } }; },
      }); },
    },
  });
  return { audio, urls, removed: () => removed, unsubscribed: () => unsubscribed, emit: (i: number, s: Record<string, unknown>) => listeners[i](s) };
}

test("subscription removal failure still releases the player and resets playing once", async () => {
  const h = loadAudio();
  const states: boolean[] = [];
  const cancel = h.audio.playHarfSes(1, undefined, playing => states.push(playing));
  await Promise.resolve();
  cancel();
  cancel();
  h.audio.stopHarfSes();
  assert.equal(h.unsubscribed(), 1);
  assert.equal(h.removed(), 1);
  assert.deepEqual(states, [false]);
});

test("word matching uses NFC and excludes unknown words and inherited keys", () => {
  const { audio } = loadAudio();
  assert.equal(audio.kelimeSesId("رَزَقَ"), "s13_01");
  assert.equal(audio.kelimeSesId("أَبْ".normalize("NFD")), "s14_01");
  assert.equal(audio.kelimeSesId("unknown"), null);
  assert.equal(audio.kelimeSesId("toString"), null);
});

test("word and letter audio share one player and preserve their URLs", async () => {
  const h = loadAudio();
  const states: boolean[] = [];
  h.audio.playHarfSes(1, undefined, playing => states.push(playing));
  await Promise.resolve();
  h.audio.playKelimeSes("رَزَقَ");
  await Promise.resolve();
  assert.deepEqual(states, [false]);
  assert.equal(h.removed(), 1);
  h.audio.playHarfSes(2);
  await Promise.resolve();
  assert.equal(h.removed(), 2);
  assert.deepEqual(h.urls, [
    "https://audio.invalid/audio/elifba/harf_01.mp3",
    "https://audio.invalid/audio/elifba/kelime/s13_01.mp3",
    "https://audio.invalid/audio/elifba/harf_02.mp3",
  ]);
  h.audio.stopHarfSes();
});

test("unknown words do not create a player or report an error", () => {
  const h = loadAudio();
  const cancel = h.audio.playKelimeSes("unknown", () => assert.fail("unexpected error"));
  cancel();
  assert.deepEqual(h.urls, []);
});

test("missing word audio clears playback and reports an optional error once", async () => {
  const h = loadAudio();
  const states: boolean[] = [];
  let errors = 0;
  h.audio.playKelimeSes("رَزَقَ", () => errors++, playing => states.push(playing));
  await Promise.resolve();
  h.emit(0, { playing: false, error: "404" });
  h.emit(0, { playing: false, error: "404" });
  assert.equal(errors, 1);
  assert.equal(h.removed(), 1);
  assert.ok(states.every(playing => !playing));
});

test("an old cancel reference does not reset playing for a newer sound", async () => {
  const h = loadAudio();
  const states: boolean[] = [];
  const onPlaying = (playing: boolean) => states.push(playing);
  const oldCancel = h.audio.playHarfSes(1, undefined, onPlaying);
  await Promise.resolve();
  const newCancel = h.audio.playHarfSes(2, undefined, onPlaying);
  assert.deepEqual(states, [false]);
  states.length = 0;
  oldCancel();
  assert.deepEqual(states, []);
  assert.equal(h.removed(), 1);
  newCancel();
  assert.equal(h.removed(), 2);
});

test("after a sound finishes naturally its old cancel does not reset a newer sound", async () => {
  const h = loadAudio();
  const states: boolean[] = [];
  const onPlaying = (playing: boolean) => states.push(playing);
  const oldCancel = h.audio.playHarfSes(1, undefined, onPlaying);
  await Promise.resolve(); await Promise.resolve();
  h.emit(0, { isLoaded: true, playing: false, didJustFinish: true });
  h.audio.playHarfSes(2, undefined, onPlaying);
  await Promise.resolve(); await Promise.resolve();
  h.emit(1, { isLoaded: true, playing: true, didJustFinish: false });
  states.length = 0;
  oldCancel();
  assert.deepEqual(states, []);
});
