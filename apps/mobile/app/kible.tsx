import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, Linking, Animated, Easing,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Magnetometer, Accelerometer, DeviceMotion } from "expo-sensors";
import * as Haptics from "expo-haptics";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const MECCA     = { lat: 21.4225, lng: 39.8262 };
const { width } = Dimensions.get("window");
const SIZE      = Math.min(width - 48, 300);
const OUTER     = SIZE + 44; // dönen pusula gülü (dış kadran)
const FACE      = SIZE - 56; // iç ibre dairesi — yön bandına (tik+harf) yer açacak kadar küçük
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

// ── Kıble hesabı (büyük çember yönü) ─────────────────────────────────────────

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

function calcQibla(lat: number, lng: number): number {
  const dLng = toRad(MECCA.lng - lng);
  const φ1   = toRad(lat), φ2 = toRad(MECCA.lat);
  const x    = Math.sin(dLng) * Math.cos(φ2);
  const y    = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

// Manyetik sapma (deklinasyon) — pusula manyetik kuzeyi, kıble gerçek kuzeyi kullanır.
// Türkiye için kaba yaklaşım (2025): doğuya gidildikçe ~+4.5° → +7°E artar.
// gerçek_yön = manyetik_yön + sapma. (Türkiye dışında kabaca; uygulama TR odaklı.)
function calcDeclination(lat: number, lng: number): number {
  const d = 4.5 + (lng - 27) * 0.15;
  return Math.max(0, Math.min(8, d)); // makul aralığa sıkıştır
}

function calcDist(lat: number, lng: number): number {
  const R    = 6371;
  const dLat = toRad(MECCA.lat - lat);
  const dLng = toRad(MECCA.lng - lng);
  const a    = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(MECCA.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

// Yumuşak dikey degrade — expo-linear-gradient yok, katmanlı taklit (build gerektirmez)
const BgGradient = React.memo(function BgGradient() {
  const from = [240, 253, 250]; // #f0fdfa
  const to   = [167, 243, 208]; // #a7f3d0
  const N = 14;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: N }, (_, i) => {
        const t = i / (N - 1);
        const r = Math.round(from[0] + (to[0] - from[0]) * t);
        const g = Math.round(from[1] + (to[1] - from[1]) * t);
        const b = Math.round(from[2] + (to[2] - from[2]) * t);
        return <View key={i} style={{ flex: 1, backgroundColor: `rgb(${r},${g},${b})` }} />;
      })}
    </View>
  );
});

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Step = "locating" | "compass";

export default function KibleScreen() {
  // Ekrana girince doğrudan konuma geçilir; pick ekranı yok
  const insets = useSafeAreaInsets();
  const [step, setStep]           = useState<Step>("locating");
  const [qibla, setQibla]         = useState<number | null>(null);
  const [distance, setDistance]   = useState<number | null>(null);
  const [cityName, setCityName]   = useState("");
  const [compassOk, setCompassOk] = useState<boolean | null>(null);
  const [showCalib, setShowCalib] = useState(true);
  const [isAligned, setIsAligned] = useState(false);

  const headingBuf = useRef<number[]>([]);
  const gotData    = useRef(false);
  const declRef    = useRef(0); // konuma göre manyetik sapma (deklinasyon)
  const qiblaRef   = useRef<number | null>(null);
  const accRef     = useRef({ x: 0, y: 0, z: 1 }); // ivmeölçer; acc gelene dek düz tutuş varsayımı
  const headingRef = useRef(0); // unwrapped heading (JS — hizalama hesabı için)
  const needleRef  = useRef(0); // unwrapped Kabe ibresi açısı
  const alignedRef = useRef(false);
  // getLocation() çok adımlı async (izin + 3 aşamalı konum denemesi, ~25 sn'e kadar
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

  // Heading — Magnetometer (varsa, güvenilir) → yoksa watchHeadingAsync'e düş.
  useEffect(() => {
    if (step !== "compass") return;

    let active = true;
    gotData.current = false;

    // Nihai yön (0–360) → yumuşatma + akıcı animasyon + hizalama kontrolü
    const onDeg = (deg: number) => {
      if (!active || !(deg >= 0)) return;
      gotData.current = true;
      headingBuf.current = [...headingBuf.current.slice(-(SMOOTH_N - 1)), deg];
      const avg = avgAngles(headingBuf.current); // 0–360

      const nextH = unwrap(headingRef.current, avg);
      headingRef.current = nextH;
      Animated.timing(headingAnim, { toValue: nextH, duration: 120, easing: Easing.linear, useNativeDriver: true }).start();

      const q = qiblaRef.current;
      if (q !== null) {
        const needle0 = (q - avg + 360) % 360; // 0–360
        const nextN = unwrap(needleRef.current, needle0);
        needleRef.current = nextN;
        Animated.timing(needleAnim, { toValue: nextN, duration: 120, easing: Easing.linear, useNativeDriver: true }).start();

        // Hizalama: ibre ±ALIGN_DEG içindeyse → haptic (yalnız ilk girişte) + görsel vurgu
        const aligned = needle0 <= ALIGN_DEG || needle0 >= 360 - ALIGN_DEG;
        if (aligned !== alignedRef.current) {
          alignedRef.current = aligned;
          setIsAligned(aligned);
          if (aligned) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
      setCompassOk(true);
    };

    // Tilt telafili manyetik yön: ivmeölçer ile eğim düzeltmesi.
    // Telefon düz tutulurken sonuç eskisiyle birebir (pitch=roll=0 → atan2(mx,my));
    // telefon eğikken yön hatası belirgin biçimde azalır.
    const onMag = (mx: number, my: number, mz: number) => {
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

    // watchHeadingAsync yedeği (bazı cihaz/SDK'larda hiç event yollamıyor; OS heading zaten tilt-telafili)
    const startLocationHeading = () => {
      Location.watchHeadingAsync(h => onDeg(h.trueHeading >= 0 ? h.trueHeading : h.magHeading))
        .then(sub => { if (active) subsRef.current.push(sub); else sub.remove(); })
        .catch(() => { if (active) setCompassOk(false); });
    };

    // Manyetometre + ivmeölçer (tilt-telafili) — kanıtlanmış yol; DeviceMotion
    // yoksa/veri vermezse buna düşülür. isAvailableAsync Android'de güvenilmez →
    // doğrudan addListener dene; exception = modül build'de yok (no-mod).
    const startMagnetometer = () => {
      try {
        Accelerometer.setUpdateInterval(100);
        Magnetometer.setUpdateInterval(100);
        subsRef.current.push(Accelerometer.addListener(d => { accRef.current = d; }));
        subsRef.current.push(Magnetometer.addListener(({ x, y, z }) => onMag(x, y, z)));
      } catch {
        startLocationHeading(); // expo-sensors yoksa son çare
      }
    };

    // Birincil: DeviceMotion (OS füzyonu). 1.5 sn içinde veri gelmezse (rotation
    // yok / eski cihaz) manyetometreye düşer.
    let dmFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (USE_DEVICE_MOTION) {
      try {
        DeviceMotion.setUpdateInterval(100);
        subsRef.current.push(
          DeviceMotion.addListener((d) => { if (d?.rotation) onDeviceMotion(d.rotation.alpha); }),
        );
        dmFallbackTimer = setTimeout(() => {
          if (active && !gotData.current) startMagnetometer();
        }, 1500);
      } catch {
        startMagnetometer();
      }
    } else {
      startMagnetometer();
    }

    // 3 sn içinde veri gelmezse net bildir: donanım yok / no-mod=build sorunu
    const noDataTimer = setTimeout(() => {
      if (active && !gotData.current) setCompassOk(false);
    }, 3000);

    return () => {
      active = false;
      clearTimeout(noDataTimer);
      if (dmFallbackTimer) clearTimeout(dmFallbackTimer);
      subsRef.current.forEach(sub => sub.remove());
      subsRef.current = [];
      headingBuf.current = [];
    };
  }, [step, headingAnim, needleAnim]);

  // Pick ekranı yok — hata/iptal durumunda ana sayfaya dön, uyarı orada görünür
  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  // Konum al — Balanced doğruluk, 3 aşamalı fallback
  const getLocation = useCallback(async () => {
    setStep("locating");
    alignedRef.current = false;
    setIsAligned(false);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (!isMountedRef.current) return;

    if (status !== "granted") {
      Alert.alert(
        "Konum İzni Gerekli",
        "Kıble pusulası için konum iznine ihtiyaç var.\n\nAyarlar → Uygulama → Kuran Yolu → İzinler → Konum → İzin Ver",
        [
          { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
          { text: "Tamam", style: "cancel" },
        ],
      );
      goHome();
      return;
    }

    let coords: { latitude: number; longitude: number } | null = null;

    // 1. Son bilinen konum (anlık)
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 4 * 3600 * 1000 });
      if (last?.coords) coords = last.coords;
    } catch { /* ignore */ }

    // 2. Balanced (ağ + GPS, Android uyumlu)
    if (!coords) {
      try {
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>(r => setTimeout(() => r(null), 15000)),
        ]);
        if (pos && "coords" in pos) coords = pos.coords;
      } catch { /* ignore */ }
    }

    // 3. GPS (uzun bekleme)
    if (!coords) {
      try {
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>(r => setTimeout(() => r(null), 25000)),
        ]);
        if (pos && "coords" in pos) coords = pos.coords;
      } catch { /* ignore */ }
    }

    if (!isMountedRef.current) return;

    if (!coords) {
      Alert.alert(
        "Konum Alınamadı",
        "GPS sinyali bulunamadı.\n\n• Açık alanda deneyin\n• WiFi veya mobil veriyi açın\n• Telefon ayarlarından konum servisini etkinleştirin",
        [
          { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
          { text: "Tamam", style: "cancel" },
        ],
      );
      goHome();
      return;
    }

    declRef.current = calcDeclination(coords.latitude, coords.longitude);
    const q = calcQibla(coords.latitude, coords.longitude);
    qiblaRef.current = q;
    setQibla(q);
    setDistance(calcDist(coords.latitude, coords.longitude));
    setCityName("Konumunuz");
    setStep("compass");
  }, [goHome]);

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

  // ── KONUM ALIYOR ──────────────────────────────────────────────────────────
  if (step === "locating") {
    return (
      <>
        <Stack.Screen options={{ title: "Kıble Yönü" }} />
        <View style={[s.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={s.loadingText}>Konumunuz alınıyor…</Text>
          <Text style={s.loadingSub}>Bu işlem 10–25 saniye sürebilir</Text>
        </View>
      </>
    );
  }

  // ── PUSULA ────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: "Kıble Yönü" }} />
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: 40 + insets.bottom }]}>
        <BgGradient />

        {/* Kalibrasyon — sade tek satır */}
        {showCalib && (
          <TouchableOpacity style={s.calibSlim} onPress={() => setShowCalib(false)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Kalibrasyon uyarısını kapat">
            <Text style={s.calibSlimText}>🔄 Doğruluk için telefonu <Text style={{ fontWeight: "800" }}>8 şeklinde</Text> birkaç kez çevirin</Text>
            <Text style={s.calibSlimX}>✕</Text>
          </TouchableOpacity>
        )}

        <Text style={s.cityLabel}>{cityName}</Text>
        {distance != null && (
          <Text style={s.distText}>Kabe'ye {Math.round(distance).toLocaleString("tr-TR")} km</Text>
        )}

        {/* Pusula — dönen gül (dış, K/G/D/B) + sabit lubber + iç Kabe ibresi */}
        <View style={[s.compassWrap, { width: OUTER, height: OUTER }]}>

          {/* Sabit lubber göstergesi — telefonun baktığı yön (dönmez) */}
          <View style={s.lubber}>
            <View style={s.lubberHalo} />
            <View style={s.lubberTri} />
          </View>

          {/* ÜST KADRAN = dönen pusula gülü. Harfler konumları döner ama dik kalır. */}
          <Animated.View style={[s.rose, { width: OUTER, height: OUTER, borderRadius: OUTER / 2, transform: [{ rotate: roseRotate }] }]}>
            {TICKS.map((a) => (
              <View key={`t${a}`} style={[s.tickLayer, { transform: [{ rotate: `${a}deg` }] }]}>
                <View style={[s.tickMark, a % 90 === 0 ? s.tickMajor : null, a === 0 ? s.tickN : null]} />
              </View>
            ))}
            {DIRS.map((d) => (
              <View key={d.l} style={[s.dirLayer, { transform: [{ rotate: `${d.b}deg` }] }]}>
                <Animated.Text
                  style={[
                    s.dir,
                    d.major ? s.dirMajor : s.dirMinor,
                    d.b === 0 ? s.dirN : null,
                    { transform: [{ rotate: headingAnim.interpolate({ inputRange: [0, 1], outputRange: [`${-d.b}deg`, `${1 - d.b}deg`], extrapolate: "extend" }) }] },
                  ]}
                >
                  {d.l}
                </Animated.Text>
              </View>
            ))}
          </Animated.View>

          {/* İÇ DAİRE = Kabe ibresi (ayrı döner) + merkez göbeği */}
          <View style={[s.face, isAligned && s.faceOk, { width: FACE, height: FACE, borderRadius: FACE / 2 }]}>
            {/* Kuyruk (zıt yön) — denge için */}
            <Animated.View style={[s.needleLayer, { transform: [{ rotate: tailRotate }] }]}>
              <View style={[s.needleTail, { height: FACE / 2 - 34 }]} />
            </Animated.View>
            {/* Kabe oku */}
            <Animated.View style={[s.needleLayer, { transform: [{ rotate: needleRotate }] }]}>
              <View style={[s.kaabaBadge, isAligned && s.kaabaBadgeOk]}>
                <Animated.Text style={[s.needleEmoji, { transform: [{ rotate: needleCounter }] }]}>🕋</Animated.Text>
              </View>
              <View style={[s.needleUp, isAligned && s.needleUpOk, { height: FACE / 2 - 56 }]} />
            </Animated.View>
            <View style={s.centerHub} />
          </View>
        </View>

        {/* Açı */}
        <View style={[s.badge, isAligned && s.badgeOk]}>
          <Text style={[s.badgeNum, isAligned && s.badgeNumOk]}>{Math.round(qibla ?? 0)}°</Text>
          <Text style={[s.badgeSub, isAligned && s.badgeSubOk]}>
            {isAligned ? "✓ Kabe'ye dönüksünüz" : "Kuzeyden Kabe yönü"}
          </Text>
        </View>

        {/* Durum */}
        {compassOk === false && (
          <View style={[s.infoBox, { borderColor: "#fca5a5", backgroundColor: "#fff1f2" }]}>
            <Text style={[s.infoText, { color: "#991b1b" }]}>
              ⚠️ Pusula verisi alınamıyor. Bu cihazda manyetometre yok/kapalı olabilir — başka bir telefonda deneyin. İbre kıble derecesinde sabit kalır.
            </Text>
          </View>
        )}
        {compassOk === true && (
          <View style={s.infoBox}>
            <Text style={s.infoText}>📱 Telefonu çevirin; 🕋 oku üstteki kırmızı ▼ ile hizalanınca Kabe'ye dönüksünüz</Text>
          </View>
        )}

        <TouchableOpacity
          style={s.backBtn}
          onPress={() => { setCompassOk(null); setShowCalib(true); getLocation(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Konumu yenile"
        >
          <Text style={s.backBtnText}>🔄 Konumu Yenile</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdfa", alignItems: "center", padding: 20, paddingBottom: 40 },
  centered:  { flex: 1, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#134e4a", marginTop: 8 },
  loadingSub:  { fontSize: 12, color: "#5eead4" },

  // Sade kalibrasyon çubuğu
  calibSlim: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fefce8", borderRadius: 10, borderWidth: 1, borderColor: "#fde68a",
    paddingVertical: 9, paddingHorizontal: 12, marginBottom: 12,
  },
  calibSlimText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17 },
  calibSlimX:    { fontSize: 13, color: "#a16207", fontWeight: "700", paddingHorizontal: 2 },

  cityLabel: { fontSize: 15, fontWeight: "700", color: "#134e4a", marginBottom: 2, marginTop: 2 },
  distText:  { fontSize: 13, color: "#0d9488", marginBottom: 18 },

  // Pusula kapsayıcısı (sabit)
  compassWrap: { alignItems: "center", justifyContent: "center", position: "relative" },

  // Sabit lubber göstergesi — beyaz konturlu üçgen (telefon yönü)
  lubber:     { position: "absolute", top: -9, zIndex: 20, alignItems: "center" },
  lubberHalo: {
    position: "absolute", top: 0,
    width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 20,
    borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#ffffff",
  },
  lubberTri: {
    marginTop: 2.5,
    width: 0, height: 0, borderLeftWidth: 9.5, borderRightWidth: 9.5, borderTopWidth: 15,
    borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#dc2626",
  },

  // Üst kadran = dönen pusula gülü (gümüş/metalik bezel)
  rose: {
    backgroundColor: "#e4e7ec", borderWidth: 2, borderColor: "#9aa3b2",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#475569", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
  },

  // Tikler — koyu slate, gümüş bant üzerinde net görünür
  tickLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 5 },
  tickMark:  { width: 2, height: 8, backgroundColor: "#8b95a7", borderRadius: 1 },
  tickMajor: { width: 3, height: 13, backgroundColor: "#3f4a5e" },
  tickN:     { backgroundColor: "#dc2626" },

  // Yön harfleri — koyu, gümüş üzerinde okunur; harf dik kalır
  dirLayer:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 21 },
  dir:       { color: "#1e293b", textAlign: "center" },
  dirMajor:  { fontSize: 17, fontWeight: "800" },
  dirMinor:  { fontSize: 11, fontWeight: "700", color: "#5b677a" },
  dirN:      { color: "#dc2626" },

  // İç daire = ibre yüzeyi (gülden bağımsız döner)
  face: {
    backgroundColor: "#fff", borderWidth: 4, borderColor: "#cbd5e1",
    alignItems: "center", justifyContent: "center", position: "absolute",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  faceOk: { borderColor: "#34d399" }, // hizalı: yeşil çerçeve

  // İbreyi tam kaplayan dönen katman — merkez etrafında döner
  needleLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 6 },
  kaabaBadge: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff",
    borderWidth: 2, borderColor: "#059669", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
  },
  kaabaBadgeOk: { borderColor: "#34d399", backgroundColor: "#ecfdf5" },
  needleUp:   { width: 4, backgroundColor: "#059669", borderRadius: 2, marginTop: -1 },
  needleUpOk: { backgroundColor: "#34d399" },
  needleTail: { width: 4, backgroundColor: "#cbd5e1", borderRadius: 2, marginTop: 6 },
  centerHub:  { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "#059669", borderWidth: 3, borderColor: "#fff" },

  needleEmoji: { fontSize: 26 },

  // Derece kartı — şık beyaz kart
  badge: {
    marginTop: 22, backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 34, paddingVertical: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#a7f3d0",
    shadowColor: "#0f766e", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  badgeNum: { fontSize: 38, fontWeight: "800", color: "#065f46", letterSpacing: 0.5 },
  badgeSub: { fontSize: 11, color: "#0d9488", marginTop: 1, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  badgeOk:    { borderColor: "#34d399", backgroundColor: "#ecfdf5" }, // hizalı: yeşil kart
  badgeNumOk: { color: "#047857" },
  badgeSubOk: { color: "#059669" },

  infoBox:  { backgroundColor: "#ecfdf5", borderRadius: 10, padding: 12, marginTop: 12, width: "100%", borderWidth: 1, borderColor: "#a7f3d0" },
  infoText: { fontSize: 13, color: "#065f46", textAlign: "center", lineHeight: 20 },

  backBtn:     { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontSize: 14, color: "#059669", fontWeight: "600" },
});
