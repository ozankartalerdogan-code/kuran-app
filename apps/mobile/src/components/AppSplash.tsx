import React, { useRef, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Animated } from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";

const { width, height } = Dimensions.get("window");

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const videoRef = useRef<Video>(null);
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 200),
        ]),
      ),
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      onFinish();
    }
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require("../../assets/splash.mp4")}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handleStatus}
        isMuted={false}
      />

      {/* Yazı + dot animasyonu */}
      <View style={styles.overlay}>
        <Text style={styles.title}>Kuran Yolu</Text>
        <View style={styles.dotsRow}>
          {dots.map((op, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: op }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    backgroundColor: "#0a1628",
  },
  video: {
    width,
    height,
    position: "absolute",
  },
  overlay: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#d4a843",
    letterSpacing: 1.5,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#d4a843",
  },
});
