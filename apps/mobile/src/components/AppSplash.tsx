import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Animated, ImageBackground } from "react-native";

const { width, height } = Dimensions.get("window");

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
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

    const timer = setTimeout(() => {
      dotAnims.forEach(a => a.stop());
      onFinish();
    }, 1000);

    return () => {
      clearTimeout(timer);
      dotAnims.forEach(a => a.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ImageBackground
      source={require("../../assets/splash_logo.jpg")}
      style={styles.container}
      resizeMode="contain"
    >
      <View style={styles.footer}>
        <Text style={styles.title}>Kuran Yolu</Text>
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
    width,
    height,
    backgroundColor: "#060e1e",
  },
  footer: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#d4a843",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
