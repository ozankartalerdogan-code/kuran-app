import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Alert, useWindowDimensions, Linking, Animated, Easing, Platform, AccessibilityInfo,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Magnetometer, Accelerometer, DeviceMotion } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { useKeepAwakeSafe } from "../src/hooks/useKeepAwakeSafe";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../src/hooks/useColors";
import { Button, Callout, CloseButton, calloutColors, radius, space } from "../src/components/ui";
import { useStrings, getStrings, fmt, localeTag, caps } from "../src/i18n";
import kibleStrings from "../src/i18n/strings/kible";
import { magneticDeclination } from "../src/lib/geomagnetism";
import { calcQibla, calcDist } from "../src/lib/qiblaMath";
import { chooseQuickFix } from "../src/lib/qiblaLocation";
import { effectiveScreenRotation, headingForScreen } from "../src/lib/qiblaScreenRotation";
import {
  createWarningState, selectActiveWarning, isSensorUnreliable, setLocationStale,
  stepAccuracy, stepTilt, stepMagnetic, calcTiltFromAccel, calcTiltFromRotation, calcMagneticMagnitude,
  type QiblaWarningKind, type QiblaWarningState,
} from "../src/lib/qiblaWarnings";
import { READING_MAX_WIDTH } from "../src/lib/layout";
import { getSavedCoords, rememberCoords } from "../src/lib/namazNotifications";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const SMOOTH_N  = 5; // ortalama alınacak ölçüm sayısı
const MAG_OFFSET = 0; // Magnetometer yön düzeltmesi (gerekirse cihazda ince ayar)

// Heading kaynağı — DeviceMotion (OS füzyonu: ROTATION_VECTOR/CMDeviceMotion)
// birincil; ham manyetometreye göre çok daha kararlı, hard-iron kaymasına
// dayanıklı. Sorun olursa false yap → kanıtlanmış manyetometre yoluna anında
// döner (rebuild gerekmez; DeviceMotion zaten expo-sensors'ta, JS reload yeter).
const USE_DEVICE_MOTION = true;
// DeviceMotion.rotation.alpha (radyan) → pusula yönü dönüşümü. Cihazda ibre
// ters/kaymışsa bu iki sabiti ayarla (yalnız JS reload): heading = SIGN*alpha + OFFSET
const DM_SIGN   = -1; // W3C alpha (saat yönü tersi) → pusula (saat yönü)
const DM_OFFSET = 0;

// ── Açı yardımcıları ─────────────────────────────────────────────────────────

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

// Açı ortalaması (0–360 wrap-around güvenli)
function avgAngles(angles: number[]): number {
  if (angles.length === 0) return 0;
  const sinSum = angles.reduce((s, a) => s + Math.sin(toRad(a)), 0);
  const cosSum = angles.reduce((s, a) => s + Math.cos(toRad(a)), 0);
  return (toDeg(Math.atan2(sinSum / angles.length, cosSum / angles.length)) + 360) % 360;
}

// 0–360 hedefi, sürekli (unwrapped) bir açıya en kısa yoldan taşır.
// Animated dönüşün 359°→0° geçişinde tam tur atmasını engeller.
function unwrap(prev: number, next0to360: number): number {
  const cur = ((prev % 360) + 360) % 360;
  const delta = ((next0to360 - cur + 540) % 360) - 180; // -180..180
  return prev + delta;
}

// Hizalama eşiği — Kabe oku bu kadar derece içindeyse "hizalı" sayılır.
const ALIGN_DEG = 5;
// Çıkış eşiği daha geniş (histerezis): sensör gürültüsü (±1–2°) sınırda hizalı/hizasız
// arasında hızlı gidip gelmeye (titreşim + renk/yazı yanıp sönmesi) yol açmasın.
const UNALIGN_DEG = 6.5; // süzülmüş ibre kıpırtısı ~0.3° (A35 ölçümü); geniş pay yeşil bölgeyi kaydırıyor
const HAPTIC_COOLDOWN_MS = 2000;
const DEADBAND_DEG = 0.5; // bunun altındaki yön değişimi ekrana yansımaz (sensör kıpırtısı)
// Sensör örnekleme aralığı ve ibre animasyon süresi. 100 ms'de (10 Hz) hızlı dönüşte
// örnekler arası 20–40° atlıyor, ibre basamaklı/titrek görünüyordu (A35'te ölçüldü).
const SENSOR_MS = 50;
const ANIM_MS = 70;
const MAG_MONITOR_MS = 500;
const TILT_IOS_MS = 200;

const WARNING_CONTENT = {
  tilted: { text: "warnTilted", a11y: "warnTiltedA11y", icon: "phone-portrait-outline" },
  magnetic_interference: { text: "warnMagnetic", a11y: "warnMagneticA11y", icon: "magnet-outline" },
  low_accuracy: { text: "warnLowAccuracy", a11y: "warnLowAccuracyA11y", icon: "sync-outline" },
  stale_location: { text: "warnStaleLocation", a11y: "warnStaleLocationA11y", icon: "location-outline" },
} as const;

// 8 yönlü pusula gülü + 30°'lik tik açıları
const DIRS = [
  { l: "K",  b: 0,   major: true  },
  { l: "KD", b: 45,  major: false },
  { l: "D",  b: 90,  major: true  },
  { l: "GD", b: 135, major: false },
  { l: "G",  b: 180, major: true  },
  { l: "GB", b: 225, major: false },
  { l: "B",  b: 270, major: true  },
  { l: "KB", b: 315, major: false },
];
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

// Pusulada kuzey işareti kırmızısı (tik, "K" harfi, üstteki ▼). Ipucu metni "kırmızı ▼"
// dediği için hata belirteci yerine bilinçli sabit; koyu temada okunur açık ton.
const NORTH_LIGHT = "#dc2626";
const NORTH_DARK  = "#f87171";

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Step = "locating" | "compass" | "error";

export default function KibleScreen() {
  const { width, height } = useWindowDimensions();
  // Dikey telefonda mevcut ölçü birebir korunur; yatayda kısa kenar da sınırlar.
  // Telefonda en çok 300; tablette (kısa kenar ≥600) 420 — dikey tablette pusula küçük kalmasın.
  const SIZE = Math.min(width - 48, height * (width > height ? 0.48 : 1), Math.min(width, height) >= 600 ? 420 : 300);
  const OUTER = SIZE + 44;
  const FACE = SIZE - 56;
  // Ekrana girince doğrudan konuma geçilir; pick ekranı yok
  useKeepAwakeSafe(); // Pusulaya bakarken ekran kararmasın
  const insets = useSafeAreaInsets();
  const c = useColors();
  const ks = useStrings(kibleStrings) as Record<string, string>;
  const dark = c.isDark;
  const [step, setStep]           = useState<Step>("locating");
  const [permissionReady, setPermissionReady] = useState(false);
  const [qibla, setQibla]         = useState<number | null>(null);
  const [distance, setDistance]   = useState<number | null>(null);
  const [locationState, setLocationState] = useState<"fresh" | "updating" | "stale">("fresh");
  const refineRun = useRef(0);
  useEffect(() => {
    if (step !== "locating" || !permissionReady) return;
    const timer = setTimeout(() => {
      refineRun.current += 1; // Geç konum sonucu hata/yeniden deneme ekranını ezmesin.
      setStep("error");
    }, 45_000); // 15 sn + 25 sn denemeler ve kayıtlı konumu okuma payı.
    return () => clearTimeout(timer);
  }, [step, permissionReady]);
  const [compassOk, setCompassOk] = useState<boolean | null>(null);
  const [showCalib, setShowCalib] = useState(true);
  const [isAligned, setIsAligned] = useState(false);
  const warningStateRef = useRef(createWarningState());
  const [activeWarning, setActiveWarning] = useState<QiblaWarningKind | null>(null);
  const activeWarningRef = useRef<QiblaWarningKind | null>(null);
  const compassOkRef = useRef<boolean | null>(null);

  const headingBuf = useRef<number[]>([]);
  const gotData    = useRef(false);
  const declRef    = useRef(0); // konuma göre manyetik sapma (deklinasyon)
  const qiblaRef   = useRef<number | null>(null);
  const accRef     = useRef({ x: 0, y: 0, z: 1 }); // ivmeölçer; acc gelene dek düz tutuş varsayımı
  const headingRef = useRef(0); // unwrapped heading (JS — hizalama hesabı için)
  const needleRef  = useRef(0); // unwrapped Kabe ibresi açısı
  const alignedRef = useRef(false);
  const allowAlignRef = useRef(true);
  const lastHapticRef = useRef(0);
  const firstHeadingRef = useRef(true); // ilk ölçüm süzgeçsiz (ibre 0°'den süzülerek gelmesin)
  // getLocation() çok adımlı async (izin + 3 aşamalı konum denemesi, ~45 sn'e kadar
  // sürebilir); kullanıcı bu sırada ekrandan çıkarsa Alert/navigation/setState'in
  // artık ilgisiz bir ekranda tetiklenmesini önler.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  const subsRef    = useRef<{ remove: () => void }[]>([]); // mag + acc + (location) abonelikleri

  // Akıcı dönüş — RN Animated (Reanimated yerine: babel/worklets gerektirmez,
  // useNativeDriver ile dönüş native thread'de, JS re-render olmadan).
  const headingAnim = useRef(new Animated.Value(0)).current; // unwrapped heading
  const needleAnim  = useRef(new Animated.Value(0)).current; // unwrapped ibre açısı

  // Aynı ibre/hizalama hesabı hem heading hem konum değişiminde çalışır.
  const updateNeedle = useCallback((q: number, avg: number, allowAlign = allowAlignRef.current) => {
    const needle0 = (q - avg + 360) % 360; // 0–360
    const nextN = unwrap(needleRef.current, needle0);
    needleRef.current = nextN;
    Animated.timing(needleAnim, { toValue: nextN, duration: ANIM_MS, easing: Easing.linear, useNativeDriver: true }).start();

    // Hizalama: ibre ±ALIGN_DEG içindeyse → haptic (yalnız ilk girişte) + görsel vurgu
    const off = Math.min(needle0, 360 - needle0); // Kabe'den sapma, 0–180
    const aligned = allowAlign && !isSensorUnreliable(activeWarningRef.current)
      && (alignedRef.current ? off <= UNALIGN_DEG : off <= ALIGN_DEG);
    if (aligned !== alignedRef.current) {
      alignedRef.current = aligned;
      setIsAligned(aligned);
      const now = Date.now();
      if (aligned && now - lastHapticRef.current >= HAPTIC_COOLDOWN_MS) {
        lastHapticRef.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }, [needleAnim]);

  const syncWarning = useCallback((nextState: QiblaWarningState) => {
    warningStateRef.current = nextState;
    const compassAvailable = compassOkRef.current !== false;
    const next = selectActiveWarning(nextState, compassAvailable);
    if (next === activeWarningRef.current) return;
    const wasUnreliable = isSensorUnreliable(activeWarningRef.current);
    activeWarningRef.current = next;
    setActiveWarning(next);
    if (isSensorUnreliable(next) && alignedRef.current) {
      alignedRef.current = false;
      setIsAligned(false);
    } else if (wasUnreliable && !isSensorUnreliable(next) && gotData.current && qiblaRef.current !== null) {
      updateNeedle(qiblaRef.current, ((headingRef.current % 360) + 360) % 360);
    }
  }, [updateNeedle]);

  const setCompassStatus = useCallback((ok: boolean | null) => {
    if (compassOkRef.current === ok) return;
    compassOkRef.current = ok;
    setCompassOk(ok);
    syncWarning(warningStateRef.current);
  }, [syncWarning]);

  // Heading — Magnetometer (varsa, güvenilir) → yoksa watchHeadingAsync'e düş.
  useEffect(() => {
    syncWarning(setLocationStale(createWarningState(), warningStateRef.current.locationStale));
    if (step !== "compass") return;

    let active = true;
    let screenRotation: number | undefined = 0;
    let lastOrientationAt = 0;
    gotData.current = false;
    firstHeadingRef.current = true;
    allowAlignRef.current = true;
    let lastHeadingAllowAlign = true;

    // Nihai yön (0–360) → yumuşatma + akıcı animasyon + hizalama kontrolü
    const onDeg = (deg: number, allowAlign = true) => {
      if (!active || !(deg >= 0)) return;
      const alignmentPermissionChanged = lastHeadingAllowAlign !== allowAlign;
      lastHeadingAllowAlign = allowAlign;
      allowAlignRef.current = allowAlign;
      // DeviceMotion veri vermiyorsa eski yön davranışını koru.
      deg = headingForScreen(deg, effectiveScreenRotation(
        Platform.OS,
        Date.now() - lastOrientationAt <= 1500 ? screenRotation : undefined,
      ));
      gotData.current = true;
      headingBuf.current = [...headingBuf.current.slice(-(SMOOTH_N - 1)), deg];
      const raw = avgAngles(headingBuf.current); // 0–360

      // Uyarlanır alçak geçiren süzgeç: büyük dönüşte hızlı takip, dururken sensör
      // gürültüsünü güçlü bastır; ölü bölge altındaki kıpırtı ekrana hiç yansımasın.
      const target = unwrap(headingRef.current, raw);
      const diff = target - headingRef.current;
      if (!firstHeadingRef.current && Math.abs(diff) < DEADBAND_DEG) {
        if (alignmentPermissionChanged && qiblaRef.current !== null) {
          updateNeedle(qiblaRef.current, ((headingRef.current % 360) + 360) % 360, allowAlign);
        }
        return;
      }
      const k = firstHeadingRef.current ? 1 : Math.min(1, 0.12 + Math.abs(diff) / 40);
      firstHeadingRef.current = false;
      const nextH = headingRef.current + diff * k;
      const avg = ((nextH % 360) + 360) % 360;
      headingRef.current = nextH;
      Animated.timing(headingAnim, { toValue: nextH, duration: ANIM_MS, easing: Easing.linear, useNativeDriver: true }).start();

      const q = qiblaRef.current;
      if (q !== null) {
        updateNeedle(q, avg, allowAlign);
      }
      setCompassStatus(true);
    };

    // Tilt telafili manyetik yön: ivmeölçer ile eğim düzeltmesi.
    // Telefon düz tutulurken sonuç eskisiyle birebir (pitch=roll=0 → atan2(mx,my));
    // telefon eğikken yön hatası belirgin biçimde azalır.
    const onMag = (mx: number, my: number, mz: number) => {
      if (!active) return;
      syncWarning(stepMagnetic(warningStateRef.current, calcMagneticMagnitude(mx, my, mz), Date.now()));
      const { x: ax, y: ay, z: az } = accRef.current;
      const norm = Math.hypot(ax, ay, az) || 1;
      const axn = ax / norm, ayn = ay / norm;
      const pitch = Math.asin(Math.max(-1, Math.min(1, -axn)));
      const cp = Math.cos(pitch) || 1e-6;
      const roll = Math.asin(Math.max(-1, Math.min(1, ayn / cp)));
      const sr = Math.sin(roll), cr = Math.cos(roll), sp = Math.sin(pitch);
      const Xh = mx * cp + mz * sp;
      const Yh = mx * sr * sp + my * cr - mz * sr * cp;
      const angle = Math.atan2(Xh, Yh) * (180 / Math.PI);
      onDeg((MAG_OFFSET + declRef.current - angle + 360) % 360);
    };

    // DeviceMotion yönü: rotation.alpha (radyan) → pusula derecesi. Değer manyetik
    // kuzeye görelidir; deklinasyonu ekleyip gerçek kuzeye çeviririz (onMag ile
    // aynı yumuşatma/animasyon boru hattını kullanır).
    const onDeviceMotion = (alpha: number | null | undefined) => {
      if (alpha == null) return;
      const alphaDeg = alpha * (180 / Math.PI);
      const magHeading = (DM_SIGN * alphaDeg + DM_OFFSET + 360) % 360;
      onDeg((declRef.current + magHeading + 360) % 360);
    };

    // watchHeadingAsync: iOS'ta birincil (CLLocationManager heading — Apple'ın pusulası,
    // tilt-telafili), Android'de yedek. trueHeading yoksa (-1) manyetik yöne
    // deklinasyon eklenir — diğer yollarla aynı gerçek-kuzey referansı.
    let accuracyTimer: ReturnType<typeof setInterval> | null = null;
    const startLocationHeading = () => {
      let lastAccuracy: number | null = null;
      if (accuracyTimer !== null) clearInterval(accuracyTimer);
      accuracyTimer = setInterval(() => {
        if (!active) return;
        const { enterSince, fastSince, exitSince } = warningStateRef.current.accuracy;
        if (enterSince !== null || fastSince !== null || exitSince !== null) {
          syncWarning(stepAccuracy(warningStateRef.current, lastAccuracy, Date.now()));
        }
      }, 500);
      Location.watchHeadingAsync(h => {
        if (!active) return;
        lastAccuracy = h.accuracy;
        allowAlignRef.current = h.accuracy > 0;
        if (!allowAlignRef.current && alignedRef.current) {
          alignedRef.current = false;
          setIsAligned(false);
        }
        syncWarning(stepAccuracy(warningStateRef.current, h.accuracy, Date.now()));
        gotData.current = true;
        setCompassStatus(true);
        // Doğruluk düşük/0 olsa da ibre dönmeye devam eder (uyarı şeridi + hizalama durur);
        // kalibrasyonsuz iPhone'da ibre donup "uygulama kilitlendi" izlenimi vermesin.
        const deg = h.trueHeading >= 0
          ? h.trueHeading
          : h.magHeading >= 0 ? (h.magHeading + declRef.current + 360) % 360 : NaN;
        if (!Number.isFinite(deg)) return;
        onDeg(deg, h.accuracy > 0);
      })
        .then(sub => { if (active) subsRef.current.push(sub); else sub.remove(); })
        .catch(() => { if (active) setCompassStatus(false); });
    };

    // Manyetometre + ivmeölçer (tilt-telafili) — kanıtlanmış yol; DeviceMotion
    // yoksa/veri vermezse buna düşülür. isAvailableAsync Android'de güvenilmez →
    // doğrudan addListener dene; exception = modül build'de yok (no-mod).
    let magMonitorSub: { remove: () => void } | null = null;
    let magnetometerStarted = false;
    const startMagnetometer = () => {
      if (magMonitorSub) {
        magMonitorSub.remove();
        subsRef.current = subsRef.current.filter(sub => sub !== magMonitorSub);
        magMonitorSub = null;
      }
      magnetometerStarted = true;
      try {
        Accelerometer.setUpdateInterval(SENSOR_MS);
        Magnetometer.setUpdateInterval(SENSOR_MS);
        subsRef.current.push(Accelerometer.addListener(d => {
          if (!active) return;
          accRef.current = d;
          syncWarning(stepTilt(warningStateRef.current,
            calcTiltFromAccel(accRef.current.x, accRef.current.y, accRef.current.z), Date.now()));
        }));
        subsRef.current.push(Magnetometer.addListener(({ x, y, z }) => onMag(x, y, z)));
      } catch {
        startLocationHeading(); // expo-sensors yoksa son çare
      }
    };

    // Birincil: DeviceMotion (OS füzyonu). 1.5 sn içinde veri gelmezse (rotation
    // yok / eski cihaz) manyetometreye düşer.
    let dmFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const useDeviceMotionHeading = Platform.OS !== "ios" && USE_DEVICE_MOTION;
    let dmStarted = false;
    // Android'de ekran dönüşü, heading kaynağından bağımsızdır (mag / location dahil).
    if (Platform.OS === "android") {
      try {
        DeviceMotion.setUpdateInterval(SENSOR_MS);
        subsRef.current.push(DeviceMotion.addListener(d => {
          if (!active) return;
          screenRotation = d?.orientation;
          lastOrientationAt = Date.now();
          if (!magnetometerStarted && d?.rotation) {
            syncWarning(stepTilt(warningStateRef.current,
              calcTiltFromRotation(d.rotation.beta, d.rotation.gamma), Date.now()));
          }
          if (!magnetometerStarted && useDeviceMotionHeading && d?.rotation) onDeviceMotion(d.rotation.alpha);
        }));
        dmStarted = true;
      } catch {
        screenRotation = 0;
        lastOrientationAt = 0;
      }
    }
    if (Platform.OS === "ios") {
      // iOS'ta DeviceMotion.rotation.alpha = CMAttitude.yaw (xMagneticNorthZVertical:
      // X ekseni kuzey) — Android'deki -azimut'tan farklı eksen referansı, DM_SIGN/
      // DM_OFFSET Android'e göre ayarlı. iOS'un kendi heading servisi doğrudan
      // pusula yönü verir; platform farkı taşımaz.
      startLocationHeading();
      try {
        Accelerometer.setUpdateInterval(TILT_IOS_MS);
        subsRef.current.push(Accelerometer.addListener(({ x, y, z }) => {
          if (!active) return;
          syncWarning(stepTilt(warningStateRef.current, calcTiltFromAccel(x, y, z), Date.now()));
        }));
      } catch { /* Yardımcı eğim sensörü kullanılamasa da heading devam eder. */ }
    } else if (useDeviceMotionHeading && dmStarted) {
      try {
        Magnetometer.setUpdateInterval(MAG_MONITOR_MS);
        magMonitorSub = Magnetometer.addListener(({ x, y, z }) => {
          if (!active) return;
          syncWarning(stepMagnetic(warningStateRef.current, calcMagneticMagnitude(x, y, z), Date.now()));
        });
        subsRef.current.push(magMonitorSub);
      } catch { /* Yardımcı manyetik izleme heading akışını durdurmaz. */ }
      dmFallbackTimer = setTimeout(() => {
        if (active && !gotData.current) startMagnetometer();
      }, 1500);
    } else {
      startMagnetometer();
    }

    // 3 sn içinde veri gelmezse net bildir: donanım yok / no-mod=build sorunu
    const noDataTimer = setTimeout(() => {
      if (active && !gotData.current) setCompassStatus(false);
    }, 3000);

    return () => {
      active = false;
      clearTimeout(noDataTimer);
      if (accuracyTimer !== null) clearInterval(accuracyTimer);
      if (dmFallbackTimer) clearTimeout(dmFallbackTimer);
      subsRef.current.forEach(sub => sub.remove());
      subsRef.current = [];
      headingBuf.current = [];
      warningStateRef.current = setLocationStale(createWarningState(), warningStateRef.current.locationStale);
    };
  }, [step, headingAnim, updateNeedle, syncWarning, setCompassStatus]);

  // Pick ekranı yok — hata/iptal durumunda ana sayfaya dön, uyarı orada görünür
  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  // Konum al — Balanced doğruluk, 3 aşamalı fallback
  // force: "Konumu Yenile" — son bilinen konum taze olsa da yeni konum istenir (yolculukta eski konum kalmasın).
  const getLocation = useCallback(async (force = false) => {
    setLocationState("fresh");
    syncWarning(setLocationStale(warningStateRef.current, false));
    setStep("locating");
    setPermissionReady(false);
    const runId = ++refineRun.current;
    const isCurrent = () => isMountedRef.current && runId === refineRun.current;
    alignedRef.current = false;
    setIsAligned(false);

    const permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!isCurrent()) return;
    if (!permission) { setStep("error"); return; }
    const { status } = permission;

    if (status !== "granted") {
      const t = getStrings(kibleStrings);
      Alert.alert(
        t.permTitle,
        Platform.OS === "ios" ? t.permBodyIos : t.permBody,
        [
          { text: t.goSettings, onPress: () => Linking.openSettings() },
          { text: t.ok, style: "cancel" },
        ],
      );
      goHome();
      return;
    }
    setPermissionReady(true);

    // Hesaplanan yönü ekrana uygular (anlık konum ve arka plan yenilemesi ortak kullanır).
    const apply = (c: { latitude: number; longitude: number }) => {
      const q = calcQibla(c.latitude, c.longitude);
      if (q === null) {
        setStep("error");
        return false;
      }
      // Manyetik sapma: pusula manyetik kuzeyi, kıble gerçek kuzeyi kullanır (NOAA WMM2025, dünya geneli).
      declRef.current = magneticDeclination(c.latitude, c.longitude);
      qiblaRef.current = q;
      setQibla(q);
      setDistance(calcDist(c.latitude, c.longitude));
      setLocationState("fresh");
      syncWarning(setLocationStale(warningStateRef.current, false));
      if (gotData.current) updateNeedle(q, ((headingRef.current % 360) + 360) % 360);
      return true;
    };

    const currentPosition = async (timeoutMs: number) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };

    // 1. Anlık konum: son bilinen (yaşı ne olursa olsun) ya da uygulamanın kaydettiği konum.
    //    Pusula hemen açılır; konum eskiyse arka planda yenilenir.
    let last: Location.LocationObject | null = null;
    try { last = await Location.getLastKnownPositionAsync(); } catch { /* ignore */ }
    const quick = chooseQuickFix(last, await getSavedCoords(), Date.now());
    if (!isCurrent()) return;
    if (quick) {
      if (!apply(quick.coords)) return;
      setLocationState(quick.refine || force ? "updating" : "fresh");
      setStep("compass");
      if (!quick.refine && !force) return;
      try {
        const pos = await currentPosition(20000);
        if (!isMountedRef.current || runId !== refineRun.current) return;
        if (pos && "coords" in pos) {
          if (!apply(pos.coords)) return;
          rememberCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          setLocationState("stale");
          syncWarning(setLocationStale(warningStateRef.current, true));
        }
      } catch {
        if (!isCurrent()) return;
        setLocationState("stale");
        syncWarning(setLocationStale(warningStateRef.current, true));
      }
      return;
    }

    let coords: { latitude: number; longitude: number } | null = null;

    // 2. Balanced (ağ + GPS, Android uyumlu)
    if (!coords) {
      try {
        const pos = await currentPosition(15000);
        if (pos && "coords" in pos) coords = pos.coords;
      } catch { /* ignore */ }
    }

    // 3. Gizlilik metni hassas konum kullanılmadığını söylüyor; Balanced korunur.
    // Bu adım yalnız uzun bekleme süreli son denemedir.
    if (!isCurrent()) return;
    if (!coords) {
      try {
        const pos = await currentPosition(25000);
        if (pos && "coords" in pos) coords = pos.coords;
      } catch { /* ignore */ }
    }

    if (!isCurrent()) return;

    if (!coords) {
      setStep("error");
      return;
    }

    if (!apply(coords)) return;
    rememberCoords({ lat: coords.latitude, lng: coords.longitude });
    setStep("compass");
  }, [goHome, updateNeedle, syncWarning]);

  // Ekrana girince doğrudan konumdan pusulaya geç (ana menüden tıklayınca)
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    getLocation();
  }, [getLocation]);

  // Animated dönüş köprüleri: unwrapped değer (derece) → sınırsız rotate stringi
  const roseRotate    = headingAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-1deg"], extrapolate: "extend" }); // -heading
  const needleRotate  = needleAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1deg"], extrapolate: "extend" });   // needle
  const needleCounter = needleAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-1deg"], extrapolate: "extend" });  // -needle (emoji dik kalır)
  const tailRotate    = needleAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "181deg"], extrapolate: "extend" }); // needle+180

  const sensorUnreliable = isSensorUnreliable(activeWarning);
  const warningContent = activeWarning ? WARNING_CONTENT[activeWarning] : null;
  useEffect(() => {
    if (Platform.OS === "ios" && activeWarning !== null) {
      AccessibilityInfo.announceForAccessibility(ks[WARNING_CONTENT[activeWarning].a11y]);
    }
  }, [activeWarning, ks]);
  const alignmentState = compassOk === true && !sensorUnreliable ? isAligned : null;
  const previousAlignment = useRef<boolean | null>(null);
  const compassSummary = fmt(ks.compassSummary, {
    degrees: Math.round(qibla ?? 0),
    state: sensorUnreliable ? ks.alignmentPaused
      : alignmentState === null ? ks.alignmentUnavailable : alignmentState ? ks.facingKaaba : ks.notFacingKaaba,
  });
  useEffect(() => {
    const previous = previousAlignment.current;
    previousAlignment.current = alignmentState;
    if (previous !== null && alignmentState !== null && previous !== alignmentState) {
      AccessibilityInfo.announceForAccessibility(compassSummary);
    }
  }, [alignmentState, compassSummary]);

  // ── Görünüm renkleri (yalnız stil; sensör/animasyon mantığına bağlı değil) ──
  const north = dark ? NORTH_DARK : NORTH_LIGHT;
  const faceBg = isAligned ? c.greenBg : c.card;
  const kaabaBg = isAligned ? (dark ? c.greenText : c.emeraldBg) : (dark ? c.textSecondary : c.card);
  const kaabaBorder = isAligned ? (dark ? c.accent : c.actionBg) : c.accent;
  const needleColor = isAligned ? (dark ? c.greenText : c.actionBg) : c.accent;
  const calib = calloutColors(c, "warning");

  // ── KONUM ALIYOR ──────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <>
        <Stack.Screen options={{ title: ks.screenTitle }} />
        <View style={[s.centered, { backgroundColor: c.bg, paddingBottom: insets.bottom, paddingHorizontal: space.gutter }]}>
          <Callout tone="error" style={s.errorBox}>{ks.noLocBody}</Callout>
          <View style={s.errorActions}>
            <Button variant="secondary" label={ks.retry} onPress={getLocation} />
            <Button variant="secondary" label={ks.goSettings} onPress={() => { void Linking.openSettings(); }} />
          </View>
        </View>
      </>
    );
  }
  if (step === "locating") {
    return (
      <>
        <Stack.Screen options={{ title: ks.screenTitle }} />
        <View style={[s.centered, { backgroundColor: c.bg, paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[s.loadingText, { color: c.text }]}>{ks.locating}</Text>
          <Text style={[s.loadingSub, { color: c.textSecondary }]}>{ks.locatingSub}</Text>
        </View>
      </>
    );
  }

  // ── PUSULA ────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: ks.screenTitle }} />
      <View style={[s.container, { backgroundColor: c.bg }]}>
        {/* Küçük ekranda uyarı kutusu çıkınca "Konumu Yenile" taşmasın diye kaydırılabilir. */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >

        {/* Kalibrasyon — sade tek satır (uyarı tonu + ortak kapat düğmesi) */}
        {warningContent ? (
          <View accessible accessibilityLiveRegion="polite" accessibilityLabel={ks[warningContent.a11y]}
            style={[s.calibSlim, s.warningStrip, { backgroundColor: calib.bg, borderColor: calib.border }]}>
            <Ionicons name={warningContent.icon} size={18} color={calib.text} accessible={false} importantForAccessibility="no" />
            <Text style={[s.calibSlimText, { color: calib.text }]}>{ks[warningContent.text]}</Text>
          </View>
        ) : showCalib && (
          <View style={[s.calibSlim, { backgroundColor: calib.bg, borderColor: calib.border }]}>
            <Ionicons name="sync-outline" size={18} color={calib.text} accessible={false} importantForAccessibility="no" />
            <Text style={[s.calibSlimText, { color: calib.text }]}>{ks.calibPre}<Text style={{ fontWeight: "800" }}>{ks.calibBold}</Text>{ks.calibPost}</Text>
            <CloseButton onPress={() => setShowCalib(false)} accessibilityLabel={ks.calibA11y} />
          </View>
        )}

        <Text style={[s.cityLabel, { color: c.text }]}>{ks.yourLocation}</Text>
        {distance != null && (
          <Text style={[s.distText, { color: c.textSecondary }]}>{fmt(ks.distanceToKaaba, { d: Math.round(distance).toLocaleString(localeTag()) })}</Text>
        )}
        {locationState === "updating" && (
          <Text style={[s.loadingSub, s.approx, { color: c.textSecondary }]} accessibilityLiveRegion="polite">{ks.approxLocation}</Text>
        )}

        {/* Pusula — dönen gül (dış, K/G/D/B) + sabit lubber + iç Kabe ibresi */}
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.compassWrap, { width: OUTER, height: OUTER }]}>

          {/* Sabit lubber göstergesi — telefonun baktığı yön (dönmez) */}
          <View style={s.lubber}>
            <View style={[s.lubberHalo, { borderTopColor: c.bg }]} />
            <View style={[s.lubberTri, { borderTopColor: north }]} />
          </View>

          {/* ÜST KADRAN = dönen pusula gülü. Harfler konumları döner ama dik kalır. */}
          <Animated.View style={[s.rose, { backgroundColor: dark ? c.cardAlt : c.border, borderColor: dark ? c.border : c.textMuted }, { width: OUTER, height: OUTER, borderRadius: OUTER / 2, transform: [{ rotate: roseRotate }] }]}>
            {TICKS.map((a) => (
              <View key={`t${a}`} style={[s.tickLayer, { transform: [{ rotate: `${a}deg` }] }]}>
                <View style={[s.tickMark, a % 90 === 0 ? s.tickMajor : null, { backgroundColor: a === 0 ? north : a % 90 === 0 ? c.textSecondary : c.textMuted }]} />
              </View>
            ))}
            {DIRS.map((d) => (
              <View key={d.l} style={[s.dirLayer, { transform: [{ rotate: `${d.b}deg` }] }]}>
                <Animated.Text
                  accessible={false}
                  importantForAccessibility="no"
                  style={[
                    s.dir,
                    d.major ? s.dirMajor : s.dirMinor,
                    { color: d.b === 0 ? north : d.major ? c.text : c.textSecondary },
                    { transform: [{ rotate: headingAnim.interpolate({ inputRange: [0, 1], outputRange: [`${-d.b}deg`, `${1 - d.b}deg`], extrapolate: "extend" }) }] },
                  ]}
                >
                  {ks[d.l] ?? d.l}
                </Animated.Text>
              </View>
            ))}
          </Animated.View>

          {/* İÇ DAİRE = Kabe ibresi (ayrı döner) + merkez göbeği */}
          <View style={[s.face, { backgroundColor: faceBg, borderColor: isAligned ? c.accent : c.border }, { width: FACE, height: FACE, borderRadius: FACE / 2 }]}>
            {/* Kuyruk (zıt yön) — denge için */}
            <Animated.View style={[s.needleLayer, { opacity: sensorUnreliable ? 0.55 : 1, transform: [{ rotate: tailRotate }] }]}>
              <View style={[s.needleTail, { backgroundColor: c.border }, { height: Math.max(0, FACE / 2 - 34) }]} />
            </Animated.View>
            {/* Kabe oku */}
            <Animated.View style={[s.needleLayer, { opacity: sensorUnreliable ? 0.55 : 1, transform: [{ rotate: needleRotate }] }]}>
              <View style={[s.kaabaBadge, { backgroundColor: kaabaBg, borderColor: kaabaBorder }]}>
                <Animated.Text accessible={false} importantForAccessibility="no" style={[s.needleEmoji, { transform: [{ rotate: needleCounter }] }]}>🕋</Animated.Text>
              </View>
              <View style={[s.needleUp, { backgroundColor: needleColor }, { height: Math.max(0, FACE / 2 - 56) }]} />
            </Animated.View>
            <View style={[s.centerHub, { backgroundColor: needleColor, borderColor: faceBg }]} />
          </View>
        </View>

        {/* Açı */}
        <View style={[s.badge, isAligned ? { backgroundColor: c.greenBg, borderColor: c.greenBorder } : { backgroundColor: c.card, borderColor: c.border }]}>
          <Text accessible accessibilityLabel={compassSummary} style={[s.badgeNum, { color: isAligned ? c.greenText : c.text }]}>{Math.round(qibla ?? 0)}°</Text>
          <View style={s.badgeSubRow} accessible={false} importantForAccessibility="no-hide-descendants">
            {isAligned && <Ionicons name="checkmark-circle" size={14} color={c.greenText} />}
            <Text style={[s.badgeSub, { color: isAligned ? c.greenText : c.textSecondary }]}>
              {caps(isAligned ? ks.aligned : ks.northToKaaba)}
            </Text>
          </View>
        </View>

        {/* Durum */}
        {compassOk === false && (
          <Callout tone="error" style={s.infoBox}>{ks.noCompass}</Callout>
        )}
        {compassOk === true && (
          <Callout tone="neutral" icon="compass-outline" style={s.infoBox}>{ks.hint}</Callout>
        )}

        <Button
          variant="ghost"
          tone="accent"
          icon="refresh-outline"
          label={ks.refresh}
          onPress={() => { setCompassStatus(null); setShowCalib(true); getLocation(true); }}
          accessibilityLabel={ks.refreshA11y}
          style={s.refreshBtn}
        />
        </ScrollView>
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────
// Renkler satır içinde belirteçlerden gelir; burada yalnız ölçü/yerleşim var.
// Pusula ölçüleri (OUTER/FACE, tik/harf paddingTop, ibre boyları, rozet 46×46) cihazda
// ayarlandı — değiştirme.

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, alignSelf: "stretch" },
  scrollContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: space.gutter, paddingTop: space.sm },
  errorBox: { width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  errorActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.xs },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  loadingSub:  { fontSize: 12 },
  approx:      { textAlign: "center", marginBottom: space.xs },

  // Sade kalibrasyon çubuğu
  calibSlim: {
    width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: space.xs,
    borderRadius: radius.md, borderWidth: 1,
    paddingLeft: space.sm, paddingRight: space.xxs, paddingVertical: space.xxs, marginBottom: space.sm,
  },
  calibSlimText: { flex: 1, fontSize: 12, lineHeight: 17 },
  warningStrip: { paddingRight: space.sm, paddingVertical: space.xs, minHeight: 40 },

  cityLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2, marginTop: 2 },
  distText:  { fontSize: 13, marginBottom: 18 },

  // Pusula kapsayıcısı (sabit)
  compassWrap: { alignItems: "center", justifyContent: "center", position: "relative" },

  // Sabit lubber göstergesi — zemin renginde konturlu kırmızı üçgen (telefon yönü)
  lubber:     { position: "absolute", top: -9, zIndex: 20, alignItems: "center" },
  lubberHalo: {
    position: "absolute", top: 0,
    width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 20,
    borderLeftColor: "transparent", borderRightColor: "transparent",
  },
  lubberTri: {
    marginTop: 2.5,
    width: 0, height: 0, borderLeftWidth: 9.5, borderRightWidth: 9.5, borderTopWidth: 15,
    borderLeftColor: "transparent", borderRightColor: "transparent",
  },

  // Üst kadran = dönen pusula gülü (taş bezel)
  rose: {
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },

  // Tikler
  tickLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 5 },
  tickMark:  { width: 2, height: 8, borderRadius: 1 },
  tickMajor: { width: 3, height: 13 },

  // Yön harfleri — harf dik kalır
  dirLayer:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 21 },
  dir:       { textAlign: "center" },
  dirMajor:  { fontSize: 17, fontWeight: "800" },
  dirMinor:  { fontSize: 11, fontWeight: "700" },

  // İç daire = ibre yüzeyi (gülden bağımsız döner)
  face: {
    borderWidth: 4,
    alignItems: "center", justifyContent: "center", position: "absolute",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },

  // İbreyi tam kaplayan dönen katman — merkez etrafında döner
  needleLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 6 },
  kaabaBadge: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
  },
  needleUp:   { width: 4, borderRadius: 2, marginTop: -1 },
  needleTail: { width: 4, borderRadius: 2, marginTop: 6 },
  centerHub:  { position: "absolute", width: 16, height: 16, borderRadius: 8, borderWidth: 3 },

  needleEmoji: { fontSize: 26 },

  // Derece kartı — hizasızken nötr, hizalanınca yeşil (yalnız renk değişir, ölçü sabit)
  badge: {
    marginTop: 22, borderRadius: radius.lg, paddingHorizontal: 34, paddingVertical: 12,
    alignItems: "center", borderWidth: 1,
  },
  badgeNum: { fontSize: 38, fontWeight: "800", letterSpacing: 0.5 },
  badgeSubRow: { flexDirection: "row", alignItems: "center", gap: space.xxs, marginTop: 1, minHeight: 16 },
  badgeSub: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },

  infoBox:  { marginTop: space.sm, width: "100%", maxWidth: READING_MAX_WIDTH, alignSelf: "center" },
  refreshBtn: { marginTop: space.md },
});
