import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import * as Location from "expo-location";

const MECCA = { lat: 21.4225, lng: 39.8262 };
const { width } = Dimensions.get("window");
const COMPASS_SIZE = Math.min(width - 64, 280);

const CITIES = [
  { name: "İstanbul",  lat: 41.0082, lng: 28.9784 },
  { name: "Ankara",    lat: 39.9334, lng: 32.8597 },
  { name: "İzmir",     lat: 38.4189, lng: 27.1287 },
  { name: "Bursa",     lat: 40.1885, lng: 29.0610 },
  { name: "Antalya",   lat: 36.8969, lng: 30.7133 },
  { name: "Konya",     lat: 37.8714, lng: 32.4846 },
  { name: "Adana",     lat: 37.0000, lng: 35.3213 },
  { name: "Trabzon",   lat: 41.0015, lng: 39.7178 },
  { name: "Diyarbakır",lat: 37.9144, lng: 40.2306 },
  { name: "Erzurum",   lat: 39.9208, lng: 41.2671 },
];

function toRad(d: number) { return (d * Math.PI) / 180; }
function toDeg(r: number) { return (r * 180) / Math.PI; }

function calcQibla(lat: number, lng: number): number {
  const dLng = toRad(MECCA.lng - lng);
  const lat1 = toRad(lat), lat2 = toRad(MECCA.lat);
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

function calcDist(lat: number, lng: number): number {
  const R = 6371;
  const dLat = toRad(MECCA.lat - lat);
  const dLng = toRad(MECCA.lng - lng);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat)) * Math.cos(toRad(MECCA.lat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function KibleScreen() {
  const [status, setStatus]       = useState<"idle"|"locating"|"done">("idle");
  const [qibla, setQibla]         = useState<number | null>(null);
  const [distance, setDistance]   = useState<number | null>(null);
  const [city, setCity]           = useState<string | null>(null);

  const selectCity = useCallback((c: typeof CITIES[0]) => {
    setQibla(calcQibla(c.lat, c.lng));
    setDistance(calcDist(c.lat, c.lng));
    setCity(c.name);
    setStatus("done");
  }, []);

  const useGPS = useCallback(async () => {
    setStatus("locating");
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== "granted") {
        Alert.alert("Konum İzni", "Konum izni verilmedi. Lütfen şehir seçin.", [{ text: "Tamam" }]);
        setStatus("idle");
        return;
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]);
      if (!pos || !("coords" in pos)) {
        Alert.alert("Konum Alınamadı", "GPS bağlantısı kurulamadı. Lütfen şehir seçin.", [{ text: "Tamam" }]);
        setStatus("idle");
        return;
      }
      const { latitude: lat, longitude: lng } = pos.coords;
      setQibla(calcQibla(lat, lng));
      setDistance(calcDist(lat, lng));
      setCity("Konumunuz");
      setStatus("done");
    } catch {
      Alert.alert("Hata", "Konum alınırken hata oluştu.", [{ text: "Tamam" }]);
      setStatus("idle");
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Kıble Yönü" }} />
      <ScrollView style={styles.container} contentContainerStyle={{ alignItems: "center", padding: 24, paddingBottom: 40 }}>

        <Text style={styles.title}>🕋 Kıble Yönü</Text>
        <Text style={styles.sub}>Konumunuza göre Kabe'nin yönünü bulun</Text>

        {status === "locating" && (
          <View style={{ alignItems: "center", marginVertical: 32, gap: 12 }}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ color: "#5eead4", fontSize: 14 }}>Konumunuz alınıyor…</Text>
          </View>
        )}

        {status === "idle" && (
          <View style={{ width: "100%" }}>
            {/* GPS Butonu */}
            <TouchableOpacity style={styles.gpsBtn} onPress={useGPS} activeOpacity={0.8}>
              <Text style={styles.gpsBtnText}>📍 GPS ile Konum Al</Text>
            </TouchableOpacity>

            <Text style={styles.cityTitle}>veya şehir seçin</Text>
            {CITIES.map((c) => (
              <TouchableOpacity key={c.name} style={styles.cityRow} onPress={() => selectCity(c)} activeOpacity={0.7}>
                <Text style={styles.cityName}>📍 {c.name}</Text>
                <Text style={styles.cityDeg}>{Math.round(calcQibla(c.lat, c.lng))}°</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {status === "done" && qibla !== null && (
          <View style={styles.result}>
            {city && <Text style={styles.city}>{city}</Text>}
            {distance && (
              <Text style={styles.distText}>
                Kabe'ye {Math.round(distance).toLocaleString("tr-TR")} km
              </Text>
            )}

            {/* Pusula */}
            <View style={[styles.compass, { width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE/2 }]}>
              <Text style={styles.compassN}>K</Text>
              <Text style={styles.compassS}>G</Text>
              <Text style={styles.compassE}>D</Text>
              <Text style={styles.compassW}>B</Text>
              {/* Ok */}
              <View style={[styles.arrowWrap, { transform: [{ rotate: `${qibla}deg` }] }]}>
                <Text style={styles.arrowTop}>🕋</Text>
                <View style={styles.arrowLine} />
                <View style={styles.arrowLineFade} />
              </View>
            </View>

            <View style={styles.degreeBadge}>
              <Text style={styles.degreeNum}>{Math.round(qibla)}°</Text>
              <Text style={styles.degreeSub}>Kuzeyden saat yönünde</Text>
            </View>

            {/* Kullanım talimatı */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>📱 Nasıl Kullanılır?</Text>
              <Text style={styles.instructionText}>
                1. Telefonunuzu yatay tutun{"\n"}
                2. Pusuladaki <Text style={{fontWeight:"700"}}>K (Kuzey)</Text> yönünü gerçek kuzeyle hizalayın{"\n"}
                3. 🕋 oku Kabe yönünü gösterir
              </Text>
              <Text style={styles.instructionHint}>
                💡 Canlı pusula yakında eklenecek
              </Text>
            </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={useGPS} style={[styles.refreshBtn, { flex: 1 }]}>
                <Text style={styles.refreshText}>📍 GPS Yenile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStatus("idle")} style={[styles.refreshBtn, { flex: 1, backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4" }]}>
                <Text style={[styles.refreshText, { color: "#059669" }]}>Şehir Seç</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdfa" },
  title:     { fontSize: 26, fontWeight: "700", color: "#134e4a", marginTop: 24 },
  sub:       { fontSize: 13, color: "#5eead4", marginTop: 6, marginBottom: 32, textAlign: "center" },

  btn:     { backgroundColor: "#059669", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  gpsBtn:  { backgroundColor: "#059669", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
  gpsBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cityTitle: { fontSize: 14, fontWeight: "600", color: "#5eead4", marginBottom: 12, textAlign: "center" },
  cityRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#99f6e4",
  },
  cityName: { fontSize: 15, color: "#134e4a", fontWeight: "600" },
  cityDeg:  { fontSize: 13, color: "#5eead4" },

  result:   { alignItems: "center", width: "100%" },
  city:     { fontSize: 15, color: "#134e4a", fontWeight: "600" },
  distText: { fontSize: 13, color: "#5eead4", marginBottom: 24 },

  compass: {
    backgroundColor: "#fff", borderWidth: 4, borderColor: "#99f6e4",
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  compassN: { position: "absolute", top: 10, fontSize: 12, fontWeight: "700", color: "#6b7280" },
  compassS: { position: "absolute", bottom: 10, fontSize: 12, fontWeight: "700", color: "#6b7280" },
  compassE: { position: "absolute", right: 12, fontSize: 12, fontWeight: "700", color: "#6b7280" },
  compassW: { position: "absolute", left: 12, fontSize: 12, fontWeight: "700", color: "#6b7280" },

  arrowWrap:    { alignItems: "center", position: "absolute" },
  arrowTop:     { fontSize: 28, marginBottom: 2 },
  arrowLine:    { width: 3, height: 60, backgroundColor: "#059669", borderRadius: 2 },
  arrowLineFade:{ width: 3, height: 40, backgroundColor: "#d1fae5", borderRadius: 2 },

  degreeBadge: {
    marginTop: 24, backgroundColor: "#d1fae5", borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 14, alignItems: "center",
  },
  degreeNum:   { fontSize: 36, fontWeight: "700", color: "#065f46" },
  degreeSub:   { fontSize: 11, color: "#059669", marginTop: 2 },

  instructionCard: {
    backgroundColor: "#f0fdf4", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#bbf7d0", marginTop: 16, width: "100%",
  },
  instructionTitle: { fontSize: 14, fontWeight: "700", color: "#14532d", marginBottom: 8 },
  instructionText:  { fontSize: 13, color: "#166534", lineHeight: 22 },
  instructionHint:  { fontSize: 12, color: "#86efac", marginTop: 8, fontStyle: "italic" },
  refreshBtn:  { marginTop: 16 },
  refreshText: { fontSize: 13, color: "#059669" },
});
