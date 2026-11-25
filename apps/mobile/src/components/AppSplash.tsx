import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Animated, ImageBackground, useWindowDimensions } from "react-native";

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const { width, height } = useWindowDimensions();
  // Görsel 1080×2340 (~0.46). Dikey telefonlarda (<= 0.62) mevcut cover görünümü korunur;
  // yatay veya tablet gibi geniş ekranlarda logo/yazı kırpılmasın diye contain kullanılır.
  const screenAspect = height > 0 ? width / height : 1;
  const resizeMode = screenAspect <= 0.62 ? "cover" : "contain";

  const dots = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.2),
    new Animated.Value(0.2),
  ]).current;

  useEffect(() => {
    const dotAnims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1,   duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ]),
      ),
    );
    dotAnims.forEach(a => a.start());

    // Marka görünürlüğü için kısa sabit bekleme — 1000 ms açılışı gereksiz
    // uzatıyordu; 600 ms yeterli (fontlar çoğu cihazda bundan önce hazır).
    const timer = setTimeout(() => {
      dotAnims.forEach(a => a.stop());
      onFinish();
    }, 600);

    return () => {
      clearTimeout(timer);
      dotAnims.forEach(a => a.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ImageBackground
      source={require("../../assets/splash_logo.jpg")}
      style={[StyleSheet.absoluteFill, styles.container]}
      resizeMode={resizeMode}
    >
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {dots.map((op, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: op }]} />
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000517",
  },
  // "Kuran Yolu" yazısı artık görselin içinde gömülü — footer'da yalnız
  // yükleme noktaları kalır (görselin alt karanlık bölgesine denk gelir).
  footer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 9,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#d4a843",
  },
});
