import React, { useEffect, useRef } from "react";
import {
  View, Text, Image, Animated, StyleSheet, Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const LOGO_SIZE = Math.min(width * 0.55, 240);

export function AppSplash() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dotOpacity = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    // Logo + yazı animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Yükleniyor noktaları — sıralı pulse
    const dots = dotOpacity.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dotOpacity.length - i - 1) * 200),
        ]),
      ),
    );
    dots.forEach(d => d.start());

    return () => dots.forEach(d => d.stop());
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: "center" }}>
        <Image
          source={require("../../assets/icon.png")}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.title}>Kuran Yolu</Text>
        <Text style={s.subtitle}>Oku · Anla · Yaşa</Text>
      </Animated.View>

      {/* Yükleniyor noktaları */}
      <View style={s.dotsRow}>
        {dotOpacity.map((op, i) => (
          <Animated.View key={i} style={[s.dot, { opacity: op }]} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a1628",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#d4a843",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b8cba",
    letterSpacing: 2,
  },
  dotsRow: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d4a843",
  },
});
