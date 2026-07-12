/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
import { AppState } from "react-native";
import { storage, STORAGE_KEYS, setStorageChangeListener } from "./storage";

// ── Bulut yedek (Firebase anonim auth + Firestore) ─────────────────────────────
// Amaç: kaldır-kur / yeni telefon / "verileri temizle" senaryolarında kullanıcı
// ilerlemesinin (favori, not, streak, ders/elifba ilerlemesi, hatim) kaybolmaması.
//
// Tasarım:
//  • Anonim oturum → kullanıcıdan hesap İSTENMEZ. UID cihazda saklanır; Android
//    Auto Backup (allowBackup: true) auth durumunu da Google Drive'a yedeklediği
//    için kaldır-kur'da çoğu cihazda aynı UID geri gelir → yedek bulunur.
//  • Firestore'da TEK doküman: backups/{uid}. Her yazma tam anlık görüntüdür
//    (merge yok) → yerelde silinen anahtar bulutta da silinir, çakışma mantığı yok.
//  • Maliyet: okuma yalnız ilk kurulumda 1 kez (restore bayrağı sonrası 0 okuma);
//    yazma 20 sn debounce + arka plana geçişte flush → günde birkaç yazma.
//    Spark (ücretsiz) plan sınırlarının çok altında.
//  • Geri yükleme: YALNIZ yerelde boş olan anahtarlar buluttan doldurulur —
//    yerel veri her zaman kazanır; mevcut cihazda hiçbir şeyin üzerine yazılmaz.
//
// Native modüller (auth/firestore) yeni EAS build gerektirir; eski build'de
// require başarısız olur → tüm fonksiyonlar sessiz no-op (build-gated guard,
// MMKV/Sentry ile aynı desen).

type AuthModule = typeof import("@react-native-firebase/auth");
type FirestoreModule = typeof import("@react-native-firebase/firestore");

let authMod: AuthModule | null = null;
let fsMod: FirestoreModule | null = null;
try {
  authMod = require("@react-native-firebase/auth");
  fsMod = require("@react-native-firebase/firestore");
} catch { /* eski build — bulut yedek kapalı */ }

export const cloudBackupAvailable = authMod !== null && fsMod !== null;

// Yedeklenen anahtarlar: kullanıcı verisi + cihazlar arası taşınması hoş olan
// tercihler. BİLİNÇLİ dışarıda: onboarding/appTour (izin akışı yeni cihazda
// yeniden yaşanmalı), prayerCache/recentSearches (cache, yeniden oluşur).
const BACKUP_KEYS: string[] = [
  STORAGE_KEYS.favorites,
  STORAGE_KEYS.notes,
  STORAGE_KEYS.streak,
  STORAGE_KEYS.mushafBookmark,
  STORAGE_KEYS.mushafPage,
  STORAGE_KEYS.elifbaProgress,
  STORAGE_KEYS.quizScores,
  STORAGE_KEYS.derslerProgress,
  STORAGE_KEYS.hatimTracking,
  STORAGE_KEYS.nightMode,
  STORAGE_KEYS.tajweed,
  STORAGE_KEYS.ayahFontScale,
];

const RESTORE_DONE_KEY = "cloud_restore_done_v1";
// Kullanıcı yedeğini uygulama içinden sildiğinde konur: yedekleme, kullanıcı
// yeniden açana kadar tamamen kapalı kalır (silinen veri sessizce geri yüklenmesin).
const DISABLED_KEY = "cloud_backup_disabled_v1";
const DEBOUNCE_MS = 20_000;
const DELETE_TIMEOUT_MS = 10_000;

let uid: string | null = null;
let dirty = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

function backupDocRef(id: string) {
  const fs = fsMod!;
  return fs.doc(fs.getFirestore(), "backups", id);
}

// Auth durumunun diskten geri yüklenmesi asenkron — cold start'ta currentUser'a
// hemen bakmak yanıltıcı olur (null görüp yeni anonim kullanıcı yaratılabilir,
// eski UID ve yedeği kaybederdik). İlk onAuthStateChanged emisyonunu bekleriz.
function waitForInitialAuthState(): Promise<{ uid: string } | null> {
  const { getAuth, onAuthStateChanged } = authMod!;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user: { uid: string } | null) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function ensureSignedIn(): Promise<string | null> {
  const { getAuth, signInAnonymously } = authMod!;
  const existing = await waitForInitialAuthState();
  if (existing) return existing.uid;
  // Anonim sağlayıcının Firebase konsolunda AÇIK olması gerekir; kapalıysa
  // (operation-not-allowed) hata fırlar → çağıran sessizce vazgeçer, sonraki
  // açılışta yeniden denenir.
  const cred = await signInAnonymously(getAuth());
  return cred.user?.uid ?? null;
}

async function collectSnapshot(): Promise<Record<string, string>> {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const v = await storage.getString(key);
    if (v != null) data[key] = v;
  }
  return data;
}

async function pushBackup(): Promise<void> {
  const id = uid;
  if (!id || !fsMod || pushing) return;
  pushing = true;
  try {
    const { setDoc, serverTimestamp } = fsMod;
    const data = await collectSnapshot();
    // merge YOK: doküman her zaman tam anlık görüntü — silinenler bulutta kalmaz.
    await setDoc(backupDocRef(id), { data, updatedAt: serverTimestamp(), schema: 1 });
    dirty = false;
  } catch { /* ağ/izin hatası — dirty kalır, sonraki tetikte yeniden denenir */ }
  finally { pushing = false; }
}

function schedulePush(): void {
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void pushBackup(); }, DEBOUNCE_MS);
}

// İlk kurulumda (restore bayrağı yok) buluttan 1 kez oku ve YALNIZ yerelde boş
// olan anahtarları doldur. Bayrak MMKV'de → kaldır-kur'da silinir, restore yine
// çalışır; normal açılışlarda 0 Firestore okuması.
async function maybeRestore(): Promise<boolean> {
  const id = uid;
  if (!id || !fsMod) return false;
  const done = await storage.getString(RESTORE_DONE_KEY);
  if (done) return false;

  const { getDoc } = fsMod;
  const snap = await getDoc(backupDocRef(id));
  const remote = (snap.exists() ? snap.data()?.data : null) as Record<string, string> | null;
  if (remote) {
    for (const key of BACKUP_KEYS) {
      const value = remote[key];
      if (value == null) continue;
      const local = await storage.getString(key);
      if (local == null) await storage.setString(key, value);
    }
  }
  // Bayrağı restore denemesi BAŞARIYLA bittikten sonra koy (getDoc hata verirse
  // buraya gelinmez → sonraki açılışta yeniden denenir).
  await storage.setString(RESTORE_DONE_KEY, "1");
  return true; // ilk aktivasyon — çağıran ilk push'ı tetikler
}

// AppState dinleyicisi süreç ömrü boyunca bir kez kurulur (kaldırılamaz);
// storage dinleyicisi ise silme sonrası kapatılıp yeniden açmada tekrar kurulur.
let appStateWired = false;

function wireListeners(): void {
  // Değişiklik dinleyicisini HEMEN kur — auth beklerken olan değişiklikler de
  // dirty işaretlesin (push zaten uid gelene kadar no-op).
  setStorageChangeListener((key) => {
    if (BACKUP_KEYS.includes(key)) schedulePush();
  });

  if (appStateWired) return;
  appStateWired = true;
  // Arka plana geçerken bekleyen değişiklikleri hemen gönder — debounce süresi
  // dolmadan uygulama öldürülürse veri kaybolmasın.
  AppState.addEventListener("change", (state) => {
    if (state !== "active" && dirty) {
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
      void pushBackup();
    }
  });
}

/**
 * Uygulama açılışında bir kez çağrılır. Native modül yoksa anında döner.
 * Hata durumları sessizdir (ağ yok, anonim auth kapalı vb.) — bir sonraki
 * açılışta baştan denenir; kullanıcı deneyimi asla bloklanmaz.
 */
export async function initCloudBackup(): Promise<void> {
  if (!cloudBackupAvailable) return;
  // Kullanıcı yedeğini silmişse yedekleme kapalıdır — dinleyici bile kurulmaz,
  // hiçbir veri buluta gitmez (yeniden açana kadar).
  if (await storage.getString(DISABLED_KEY)) return;

  wireListeners();

  try {
    uid = await ensureSignedIn();
    if (!uid) return;
    const firstRun = await maybeRestore();
    // İlk aktivasyonda mevcut yerel veriyi (restore ile birleşmiş haliyle) bir kez
    // gönder — bulut o andan itibaren tam anlık görüntüyü tutar. Sonraki
    // açılışlarda yalnız gerçek değişiklikler push tetikler.
    if (firstRun && !dirty) schedulePush();
  } catch { /* sessiz — sonraki açılışta yeniden denenir */ }
}

// ── Uygulama içi silme (Play/App Store hesap-veri silme gereksinimi) ──────────

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Yedekleme, kullanıcı tarafından silinip kapatılmış mı? (gizlilik ekranı UI'ı için) */
export async function isCloudBackupDisabled(): Promise<boolean> {
  return (await storage.getString(DISABLED_KEY)) != null;
}

/**
 * Buluttaki yedeği VE anonim Firebase hesabını kalıcı olarak siler; yedeklemeyi
 * kullanıcı yeniden açana kadar kapatır. Cihazdaki yerel veriye dokunmaz.
 * Ağ yoksa/hata olursa false döner ve hiçbir şey değişmez (yedekleme sürer).
 */
export async function deleteCloudBackup(): Promise<boolean> {
  if (!cloudBackupAvailable) return false;

  // Bekleyen push'u iptal et ve uid'i düşür — silme sürerken debounce/AppState
  // tetiklense bile pushBackup no-op kalsın, doküman geri yazılmasın.
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  const prevUid = uid;
  uid = null;
  dirty = false;

  try {
    const { getAuth } = authMod!;
    await waitForInitialAuthState();
    const user = getAuth().currentUser;
    if (user) {
      // Önce doküman, sonra hesap: kurallar silme için auth'lu kullanıcı istiyor.
      const { deleteDoc } = fsMod!;
      await withTimeout(deleteDoc(backupDocRef(user.uid)), DELETE_TIMEOUT_MS);
      // Hesap silme ikincil: başarısız olsa da (ör. requires-recent-login) veri
      // zaten gitti, geride içeriksiz anonim hesap kalır — kullanıcıya başarı denir.
      try { await withTimeout(user.delete(), DELETE_TIMEOUT_MS); } catch { /* boş hesap kalabilir */ }
    }
    setStorageChangeListener(null);
    await storage.setString(DISABLED_KEY, "1");
    // Yeniden açılırsa restore baştan denensin (doküman yok → zararsız).
    await storage.remove(RESTORE_DONE_KEY);
    return true;
  } catch {
    uid = prevUid; // silinemedi — yedekleme eskisi gibi devam eder
    return false;
  }
}

/** Silme sonrası kapatılan bulut yedeklemeyi yeniden başlatır (yeni anonim hesapla). */
export async function enableCloudBackup(): Promise<void> {
  if (!cloudBackupAvailable) return;
  await storage.remove(DISABLED_KEY);
  // init dinleyicileri yeniden kurar, yeni anonim hesap açar ve maybeRestore'un
  // ilk-aktivasyon yolu mevcut yerel veriyi ilk push ile buluta taşır.
  await initCloudBackup();
}
