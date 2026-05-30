import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { Stack } from "expo-router";

const MECCA = { lat: 21.4225, lng: 39.8262 };
const { width } = Dimensions.get("window");
const COMPASS_SIZE = Math.min(width - 64, 280);

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
  const [status, setStatus]     = useState<"idle"|"loading"|"done"|"error">("idle");
  const [qibla, setQibla]       = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [city, setCity]         = useState<string | null>(null);

  const locate = useCallback(() => {
    setStatus("loading");
    if (!navigator.geolocation) {
      Alert.alert("Hata", "Cihazınız konum özelliğini desteklemiyor.");
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setQibla(calcQibla(latitude, longitude));
        setDistance(calcDist(latitude, longitude));
        setStatus("done");
      },
      () => {
        Alert.alert("Konum İzni", "Konum izni verilmedi veya alınamadı.");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Kıble Yönü" }} />
      <View style={styles.container}>

        <Text style={styles.title}>🕋 Kıble Yönü</Text>
        <Text style={styles.sub}>Konumunuza göre Kabe'nin yönünü bulun</Text>

        {status === "idle" && (
          <TouchableOpacity style={styles.btn} onPress={locate}>
            <Text style={styles.btnText}>📍 Konumumu Bul</Text>
          </TouchableOpacity>
        )}

        {status === "loading" && (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
        )}

        {status === "error" && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={locate}>
            <Text style={styles.btnText}>Tekrar Dene</Text>
          </TouchableOpacity>
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

            <TouchableOpacity onPress={locate} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Konumu Yenile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdfa", alignItems: "center", padding: 24 },
  title:     { fontSize: 26, fontWeight: "700", color: "#134e4a", marginTop: 24 },
  sub:       { fontSize: 13, color: "#5eead4", marginTop: 6, marginBottom: 32, textAlign: "center" },

  btn:     { backgroundColor: "#059669", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

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

  refreshBtn:  { marginTop: 16 },
  refreshText: { fontSize: 13, color: "#059669" },
});
