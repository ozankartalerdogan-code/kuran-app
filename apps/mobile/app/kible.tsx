import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { Stack } from "expo-router";
import * as Location from "expo-location";
import { Magnetometer, type MagnetometerMeasurement } from "expo-sensors";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const MECCA = { lat: 21.4225, lng: 39.8262 };
const { width } = Dimensions.get("window");
const SIZE = Math.min(width - 48, 300);

const CITIES = [
  { name: "İstanbul",   lat: 41.0082, lng: 28.9784 },
  { name: "Ankara",     lat: 39.9334, lng: 32.8597 },
  { name: "İzmir",      lat: 38.4189, lng: 27.1287 },
  { name: "Bursa",      lat: 40.1885, lng: 29.0610 },
  { name: "Antalya",    lat: 36.8969, lng: 30.7133 },
  { name: "Konya",      lat: 37.8714, lng: 32.4846 },
  { name: "Adana",      lat: 37.0000, lng: 35.3213 },
  { name: "Trabzon",    lat: 41.0015, lng: 39.7178 },
  { name: "Diyarbakır", lat: 37.9144, lng: 40.2306 },
  { name: "Erzurum",    lat: 39.9208, lng: 41.2671 },
];

// ── Matematik ─────────────────────────────────────────────────────────────────

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

/** Kullanıcı konumundan Kabe'ye olan kuzeye göreli açı (0–360, saat yönü) */
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

/**
 * Magnetometer → cihaz başlığı (derece, 0=Kuzey, saat yönü)
 * Telefon yatay tutulduğunda: x=Doğu, y=Kuzey → atan2(x, y) = saat yönü pusula açısı
 */
function magToHeading(m: MagnetometerMeasurement): number {
  return (toDeg(Math.atan2(m.x, m.y)) + 360) % 360;
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

type Step = "pick" | "locating" | "compass";

export default function KibleScreen() {
  const [step, setStep]         = useState<Step>("pick");
  const [qibla, setQibla]       = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cityName, setCityName] = useState("");
  const [heading, setHeading]   = useState(0);
  const [magAvail, setMagAvail] = useState<boolean | null>(null); // null = henüz bilinmiyor
  const subRef = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);

  // Magnetometer başlat (sadece compass adımında)
  useEffect(() => {
    if (step !== "compass") return;

    let cancelled = false;

    Magnetometer.isAvailableAsync()
      .then(available => {
        if (cancelled) return;
        setMagAvail(available);
        if (!available) return;

        Magnetometer.setUpdateInterval(80); // ~12 fps
        subRef.current = Magnetometer.addListener(data => {
          if (!cancelled) setHeading(magToHeading(data));
        });
      })
      .catch(() => { if (!cancelled) setMagAvail(false); });

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [step]);

  // Konum al (GPS → network → son bilinen, sırayla)
  const getLocation = useCallback(async () => {
    setStep("locating");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Konum izni verilmedi.\nŞehir listesinden seçim yapabilirsiniz.");
        setStep("pick");
        return;
      }

      let coords: { latitude: number; longitude: number } | null = null;

      // 1. Son bilinen konum — anlık
      const last = await Location.getLastKnownPositionAsync({ maxAge: 4 * 3600 * 1000 }).catch(() => null);
      if (last?.coords) coords = last.coords;

      // 2. Network + WiFi (GPS gerekmez)
      if (!coords) {
        const net = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
          new Promise<null>(r => setTimeout(() => r(null), 15000)),
        ]).catch(() => null);
        if (net && "coords" in net) coords = net.coords;
      }

      // 3. GPS (uzun bekleme)
      if (!coords) {
        const gps = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>(r => setTimeout(() => r(null), 20000)),
        ]).catch(() => null);
        if (gps && "coords" in gps) coords = gps.coords;
      }

      if (!coords) {
        Alert.alert(
          "Konum Alınamadı",
          "GPS sinyali bulunamadı.\n\n• Açık havada deneyin\n• WiFi veya mobil veriyi açın\n• Şehir listesinden seçim yapabilirsiniz",
          [{ text: "Tamam" }],
        );
        setStep("pick");
        return;
      }

      setQibla(calcQibla(coords.latitude, coords.longitude));
      setDistance(calcDist(coords.latitude, coords.longitude));
      setCityName("Konumunuz");
      setStep("compass");
    } catch {
      Alert.alert("Hata", "Beklenmeyen bir hata oluştu.");
      setStep("pick");
    }
  }, []);

  const pickCity = useCallback((c: typeof CITIES[0]) => {
    setQibla(calcQibla(c.lat, c.lng));
    setDistance(calcDist(c.lat, c.lng));
    setCityName(c.name);
    setStep("compass");
  }, []);

  // İbre açısı: (kıble açısı) - (cihazın baktığı yön)
  const needleAngle = qibla !== null ? (qibla - heading + 360) % 360 : 0;

  // ── KONUM SEÇ ──────────────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <>
        <Stack.Screen options={{ title: "Kıble Yönü" }} />
        <View style={s.container}>
          <Text style={s.title}>🕋 Kıble Yönü</Text>
          <Text style={s.sub}>Seccadenizi Kabe'ye döndürün</Text>

          <TouchableOpacity style={s.gpsBtn} onPress={getLocation} activeOpacity={0.85}>
            <Text style={s.gpsBtnText}>📍 Konumumu Otomatik Al</Text>
          </TouchableOpacity>

          <Text style={s.orText}>— veya şehir seçin —</Text>

          {CITIES.map(c => (
            <TouchableOpacity key={c.name} style={s.cityRow} onPress={() => pickCity(c)} activeOpacity={0.7}>
              <Text style={s.cityName}>{c.name}</Text>
              <Text style={s.cityDeg}>{Math.round(calcQibla(c.lat, c.lng))}°</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  // ── KONUM ALIYOR ──────────────────────────────────────────────────────────
  if (step === "locating") {
    return (
      <>
        <Stack.Screen options={{ title: "Kıble Yönü" }} />
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={s.loadingText}>Konumunuz alınıyor…</Text>
          <Text style={s.loadingSub}>Bu işlem 10–20 saniye sürebilir</Text>
        </View>
      </>
    );
  }

  // ── PUSULA ────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: "Kıble Yönü" }} />
      <View style={s.container}>
        <Text style={s.cityLabel}>{cityName}</Text>
        {distance != null && (
          <Text style={s.distText}>Kabe'ye {Math.round(distance).toLocaleString("tr-TR")} km</Text>
        )}

        {/* Pusula dairesi */}
        <View style={[s.compass, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]}>
          {/* Sabit yön etiketleri */}
          <Text style={[s.dir, { top: 10 }]}>K</Text>
          <Text style={[s.dir, { bottom: 10 }]}>G</Text>
          <Text style={[s.dir, { right: 14 }]}>D</Text>
          <Text style={[s.dir, { left: 14 }]}>B</Text>

          {/* Kabe ibresi — needleAngle kadar döner */}
          <View style={[s.needle, { transform: [{ rotate: `${needleAngle}deg` }] }]}>
            <Text style={s.needleEmoji}>🕋</Text>
            <View style={s.needleUp} />
            <View style={s.needleDown} />
          </View>
        </View>

        {/* Açı bilgisi */}
        <View style={s.badge}>
          <Text style={s.badgeNum}>{Math.round(qibla ?? 0)}°</Text>
          <Text style={s.badgeSub}>Kuzeyden Kabe yönü</Text>
        </View>

        {/* Magnetometer durumu */}
        {magAvail === false && (
          <View style={s.info}>
            <Text style={s.infoText}>
              ⚠️ Manyetometre bu cihazda desteklenmiyor.{"\n"}
              İbre sabit — telefonu K yönüyle hizalayın, 🕋 Kabe'yi gösterir.
            </Text>
          </View>
        )}
        {magAvail === true && (
          <View style={s.info}>
            <Text style={s.infoText}>
              📱 Telefonu yatay tutun · 🕋 daima Kabe yönünü gösterir
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.backBtn} onPress={() => { setStep("pick"); setMagAvail(null); }} activeOpacity={0.7}>
          <Text style={s.backBtnText}>← Konumu Değiştir</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f0fdfa", alignItems: "center", padding: 20, paddingBottom: 40 },
  centered:    { flex: 1, backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#134e4a", marginTop: 8 },
  loadingSub:  { fontSize: 12, color: "#5eead4" },

  title: { fontSize: 24, fontWeight: "700", color: "#134e4a", marginTop: 16, marginBottom: 4 },
  sub:   { fontSize: 13, color: "#5eead4", marginBottom: 20, textAlign: "center" },

  gpsBtn:     { backgroundColor: "#059669", borderRadius: 14, paddingVertical: 15, width: "100%", alignItems: "center", marginBottom: 16 },
  gpsBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  orText:     { fontSize: 13, color: "#a7f3d0", marginBottom: 12 },

  cityRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 7, borderWidth: 1, borderColor: "#99f6e4", width: "100%",
  },
  cityName: { fontSize: 15, color: "#134e4a", fontWeight: "600" },
  cityDeg:  { fontSize: 13, color: "#5eead4", fontWeight: "600" },

  cityLabel: { fontSize: 16, fontWeight: "700", color: "#134e4a", marginBottom: 2, marginTop: 12 },
  distText:  { fontSize: 13, color: "#5eead4", marginBottom: 24 },

  compass: {
    backgroundColor: "#fff", borderWidth: 4, borderColor: "#99f6e4",
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  dir: { position: "absolute", fontSize: 13, fontWeight: "700", color: "#6b7280" },

  needle:      { alignItems: "center", position: "absolute" },
  needleEmoji: { fontSize: 32 },
  needleUp:    { width: 3, height: 70, backgroundColor: "#059669", borderRadius: 2 },
  needleDown:  { width: 3, height: 40, backgroundColor: "#d1fae5", borderRadius: 2 },

  badge:    { marginTop: 24, backgroundColor: "#d1fae5", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 12, alignItems: "center" },
  badgeNum: { fontSize: 38, fontWeight: "700", color: "#065f46" },
  badgeSub: { fontSize: 12, color: "#059669", marginTop: 2 },

  info:     { backgroundColor: "#ecfdf5", borderRadius: 10, padding: 12, marginTop: 14, width: "100%", borderWidth: 1, borderColor: "#a7f3d0" },
  infoText: { fontSize: 13, color: "#065f46", textAlign: "center", lineHeight: 20 },

  backBtn:     { marginTop: 18, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontSize: 14, color: "#059669", fontWeight: "600" },
});
