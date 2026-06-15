import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, Linking,
} from "react-native";
import { Stack, router } from "expo-router";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const MECCA     = { lat: 21.4225, lng: 39.8262 };
const { width } = Dimensions.get("window");
const SIZE      = Math.min(width - 48, 300);
const OUTER     = SIZE + 44; // dış halka (telefon yönü referansı)
const SMOOTH_N  = 5; // ortalama alınacak ölçüm sayısı
const MAG_OFFSET = 0; // Magnetometer yön düzeltmesi (gerekirse cihazda ince ayar)

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

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Step = "locating" | "compass";

export default function KibleScreen() {
  // Ekrana girince doğrudan konuma geçilir; pick ekranı yok
  const [step, setStep]           = useState<Step>("locating");
  const [qibla, setQibla]         = useState<number | null>(null);
  const [distance, setDistance]   = useState<number | null>(null);
  const [cityName, setCityName]   = useState("");
  const [heading, setHeading]     = useState(0);
  const [compassOk, setCompassOk] = useState<boolean | null>(null);
  const [showCalib, setShowCalib] = useState(true);

  const headingBuf = useRef<number[]>([]);
  const headingSub = useRef<{ remove: () => void } | null>(null);

  // Heading — Magnetometer (varsa, güvenilir) → yoksa watchHeadingAsync'e düş.
  useEffect(() => {
    if (step !== "compass") return;

    let active = true;

    const onDeg = (deg: number) => {
      if (!active || !(deg >= 0)) return;
      headingBuf.current = [...headingBuf.current.slice(-(SMOOTH_N - 1)), deg];
      setHeading(avgAngles(headingBuf.current));
      setCompassOk(true);
    };

    // Bu cihaz/SDK'da watchHeadingAsync bazen hiç event yollamıyor → yedek yol
    const startLocationHeading = () => {
      Location.watchHeadingAsync(h => onDeg(h.trueHeading >= 0 ? h.trueHeading : h.magHeading))
        .then(sub => { if (active) headingSub.current = sub; else sub.remove(); })
        .catch(() => setCompassOk(false));
    };

    Magnetometer.isAvailableAsync()
      .then(ok => {
        if (!active) return;
        if (!ok) { startLocationHeading(); return; }
        Magnetometer.setUpdateInterval(100);
        const sub = Magnetometer.addListener(({ x, y }) => {
          // Cihaz ekseni: x=sağ, y=üst. Telefon üst kenarının manyetik kuzeyden açısı:
          const angle = Math.atan2(x, y) * (180 / Math.PI);
          onDeg((MAG_OFFSET - angle + 360) % 360);
        });
        headingSub.current = sub;
      })
      .catch(() => { if (active) startLocationHeading(); });

    return () => {
      active = false;
      headingSub.current?.remove();
      headingSub.current = null;
      headingBuf.current = [];
    };
  }, [step]);

  // Pick ekranı yok — hata/iptal durumunda ana sayfaya dön, uyarı orada görünür
  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  // Konum al — Balanced doğruluk, 3 aşamalı fallback
  const getLocation = useCallback(async () => {
    setStep("locating");

    const { status } = await Location.requestForegroundPermissionsAsync();

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
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<null>(r => setTimeout(() => r(null), 25000)),
        ]);
        if (pos && "coords" in pos) coords = pos.coords;
      } catch { /* ignore */ }
    }

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

    setQibla(calcQibla(coords.latitude, coords.longitude));
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

  // İbre açısı: kıble gerçek yönü - cihazın baktığı gerçek yön
  const needleAngle = qibla !== null ? (qibla - heading + 360) % 360 : 0;

  // ── KONUM ALIYOR ──────────────────────────────────────────────────────────
  if (step === "locating") {
    return (
      <>
        <Stack.Screen options={{ title: "Kıble Yönü" }} />
        <View style={s.centered}>
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
      <View style={s.container}>

        {/* Kalibrasyon uyarısı */}
        {showCalib && (
          <View style={s.calibCard}>
            <Text style={s.calibTitle}>🔄 Kalibrasyon Önerisi</Text>
            <Text style={s.calibText}>
              Pusulanın doğruluğunu artırmak için telefonu <Text style={{ fontWeight: "700" }}>8 şeklinde</Text> birkaç kez hareket ettirin.
            </Text>
            <TouchableOpacity onPress={() => setShowCalib(false)} style={s.calibClose}>
              <Text style={s.calibCloseText}>Anladım ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.cityLabel}>{cityName}</Text>
        {distance != null && (
          <Text style={s.distText}>Kabe'ye {Math.round(distance).toLocaleString("tr-TR")} km</Text>
        )}

        {/* Dış halka = TELEFON yönü (sabit). Tepedeki ▼ telefonun baktığı yön. */}
        <View style={[s.outerRing, { width: OUTER, height: OUTER, borderRadius: OUTER / 2 }]}>
          <Text style={s.phoneTag}>telefon</Text>
          <Text style={s.phoneMarker}>▼</Text>

          {/* İç daire = PUSULA. Kadran telefon yönüne göre döner (gerçek K/G/D/B). */}
          <View style={[s.compass, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]}>
            {/* Dönen kadran — K/G/D/B her zaman gerçek coğrafi yönleri gösterir */}
            <View style={[s.rotLayer, { transform: [{ rotate: `${-heading}deg` }] }]}>
              <Text style={[s.dir, s.dirN, { top: 8 }]}>K</Text>
              <Text style={[s.dir, { bottom: 8 }]}>G</Text>
              <Text style={[s.dir, { right: 12 }]}>D</Text>
              <Text style={[s.dir, { left: 12 }]}>B</Text>
            </View>

            {/* Kabe ibresi — gerçek Kabe yönünü gösterir */}
            <View style={[s.needleLayer, { transform: [{ rotate: `${needleAngle}deg` }] }]}>
              <Text style={s.needleEmoji}>🕋</Text>
              <View style={s.needleUp} />
            </View>
          </View>
        </View>

        {/* Açı */}
        <View style={s.badge}>
          <Text style={s.badgeNum}>{Math.round(qibla ?? 0)}°</Text>
          <Text style={s.badgeSub}>Kuzeyden Kabe yönü · pusula {Math.round(heading)}°</Text>
        </View>

        {/* Durum */}
        {compassOk === false && (
          <View style={[s.infoBox, { borderColor: "#fca5a5", backgroundColor: "#fff1f2" }]}>
            <Text style={[s.infoText, { color: "#991b1b" }]}>
              ⚠️ Pusula bu cihazda desteklenmiyor. İbre sabit — K yönünü gerçek kuzeyle hizalayın.
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

  calibCard: {
    width: "100%", backgroundColor: "#fefce8", borderRadius: 12,
    borderWidth: 1, borderColor: "#fde047", padding: 12, marginBottom: 10,
  },
  calibTitle:     { fontSize: 13, fontWeight: "700", color: "#854d0e", marginBottom: 4 },
  calibText:      { fontSize: 12, color: "#92400e", lineHeight: 18 },
  calibClose:     { alignSelf: "flex-end", marginTop: 6 },
  calibCloseText: { fontSize: 12, color: "#a16207", fontWeight: "600" },

  cityLabel: { fontSize: 15, fontWeight: "700", color: "#134e4a", marginBottom: 2, marginTop: 4 },
  distText:  { fontSize: 13, color: "#5eead4", marginBottom: 18 },

  // Dış halka — telefon yönü referansı (sabit)
  outerRing: {
    backgroundColor: "#ecfeff", borderWidth: 2, borderColor: "#cffafe",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  phoneTag:    { position: "absolute", top: 4, fontSize: 9, fontWeight: "700", color: "#dc2626", letterSpacing: 1, zIndex: 10 },
  phoneMarker: { position: "absolute", top: 13, fontSize: 18, color: "#dc2626", zIndex: 10 },

  compass: {
    backgroundColor: "#fff", borderWidth: 4, borderColor: "#99f6e4",
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },

  // Daireyi tam kaplayan dönen katmanlar — merkez etrafında döner
  rotLayer:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  needleLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: 8 },

  dir:  { position: "absolute", fontSize: 13, fontWeight: "700", color: "#6b7280" },
  dirN: { color: "#dc2626" }, // Kuzey kırmızı

  needleEmoji: { fontSize: 30 },
  needleUp:    { width: 3, height: 70, backgroundColor: "#059669", borderRadius: 2 },

  badge:    { marginTop: 20, backgroundColor: "#d1fae5", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 10, alignItems: "center" },
  badgeNum: { fontSize: 36, fontWeight: "700", color: "#065f46" },
  badgeSub: { fontSize: 12, color: "#059669", marginTop: 2 },

  infoBox:  { backgroundColor: "#ecfdf5", borderRadius: 10, padding: 12, marginTop: 12, width: "100%", borderWidth: 1, borderColor: "#a7f3d0" },
  infoText: { fontSize: 13, color: "#065f46", textAlign: "center", lineHeight: 20 },

  backBtn:     { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontSize: 14, color: "#059669", fontWeight: "600" },
});
