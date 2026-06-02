import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Animated } from "react-native";

const { width, height } = Dimensions.get("window");

const NUM_PAGES     = 10;
const FLIP_DURATION = 180;
const FLIP_STAGGER  = 90;

const PAGE_W    = 52;
const PAGE_H    = 68;
const BOOK_TOP  = height * 0.18;
const BOOK_SIZE = width * 0.68;
const SPINE_X   = width / 2;
const SPINE_Y   = BOOK_TOP + BOOK_SIZE * 0.58;

// Shimmer şeridi: 3 katman (kenar / orta / kenar) birlikte hareket eder
const STRIP_EDGE_W   = 28;
const STRIP_CENTER_W = 22;
const SHIMMER_TOTAL  = STRIP_EDGE_W * 2 + STRIP_CENTER_W;

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const pageAnims    = useRef(Array.from({ length: NUM_PAGES }, () => new Animated.Value(0))).current;
  const glowScale    = useRef(new Animated.Value(1)).current;
  const glowOpacity  = useRef(new Animated.Value(0.15)).current;
  const bookScale    = useRef(new Animated.Value(0.82)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // Shimmer şeridinin X pozisyonu
  const shimmerX   = useRef(new Animated.Value(-SHIMMER_TOTAL)).current;
  // Köşe ışık huzmesi opacity
  const rayOpacity = useRef(new Animated.Value(0)).current;

  const dots = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    // ── Kitap giriş ───────────────────────────────────────────
    Animated.spring(bookScale, {
      toValue: 1, tension: 70, friction: 7, useNativeDriver: true,
    }).start();

    // ── Altın halo pulse ──────────────────────────────────────
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1.2,  duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.22, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1,    duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.10, duration: 800, useNativeDriver: true }),
        ]),
      ]),
    );
    glowAnim.start();

    // ── Shimmer soldan sağa, 2.5s loop ───────────────────────
    const shimmerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: width + SHIMMER_TOTAL,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(shimmerX, {
          toValue: -SHIMMER_TOTAL,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmerAnim.start();

    // ── Köşe ışık huzmesi pulse ───────────────────────────────
    const rayAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(rayOpacity, { toValue: 0.20, duration: 900, useNativeDriver: true }),
        Animated.timing(rayOpacity, { toValue: 0,    duration: 900, useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    rayAnim.start();

    // ── Sayfa uçuş animasyonları ──────────────────────────────
    const pageFlips = pageAnims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * FLIP_STAGGER),
        Animated.timing(anim, { toValue: 1, duration: FLIP_DURATION, useNativeDriver: true }),
      ]),
    );

    // ── Başlık fade-in ─────────────────────────────────────────
    const titleDelay = NUM_PAGES * FLIP_STAGGER + FLIP_DURATION + 200;
    const titleAnim  = Animated.sequence([
      Animated.delay(titleDelay),
      Animated.timing(titleOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]);

    // ── Dot animasyonları ─────────────────────────────────────
    const dotAnims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ]),
      ),
    );

    Animated.parallel([...pageFlips, titleAnim]).start();
    dotAnims.forEach(a => a.start());

    const totalMs = titleDelay + 450 + 700;
    const timer = setTimeout(() => {
      glowAnim.stop();
      shimmerAnim.stop();
      rayAnim.stop();
      dotAnims.forEach(a => a.stop());
      onFinish();
    }, totalMs);

    return () => {
      clearTimeout(timer);
      glowAnim.stop();
      shimmerAnim.stop();
      rayAnim.stop();
      dotAnims.forEach(a => a.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>

      {/* Altın halo */}
      <Animated.View
        style={[styles.glow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}
      />

      {/* Kitap görseli */}
      <Animated.Image
        source={require("../../assets/icon.png")}
        style={[styles.bookImage, { transform: [{ scale: bookScale }] }]}
        resizeMode="contain"
      />

      {/* ── Shimmer: 3 katmanlı şerit ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.shimmerWrap, { transform: [{ translateX: shimmerX }] }]}
      >
        {/* Sol kenar — soluk */}
        <View style={[styles.shimmerStrip, { width: STRIP_EDGE_W, opacity: 0.10 }]} />
        {/* Orta — parlak */}
        <View style={[styles.shimmerStrip, { width: STRIP_CENTER_W, opacity: 0.28 }]} />
        {/* Sağ kenar — soluk */}
        <View style={[styles.shimmerStrip, { width: STRIP_EDGE_W, opacity: 0.10 }]} />
      </Animated.View>

      {/* ── Köşe ışık huzmesi (sol üst → sağ alt) ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ray, { opacity: rayOpacity }]}
      />

      {/* Uçan sayfalar */}
      {pageAnims.map((anim, i) => {
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(width * 0.42 + i * 12)],
        });
        const translateY = anim.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, -(55 + i * 4), -(15 + i * 2)],
        });
        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${-18 - i * 2.5}deg`],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.25, 0.75, 1],
          outputRange: [0, 0.92, 0.55, 0],
        });
        const scaleX = anim.interpolate({
          inputRange: [0, 0.45, 1],
          outputRange: [1, 0.45, 0.15],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.page,
              {
                left:   SPINE_X + 8 + i * 1.8 - PAGE_W / 2,
                top:    SPINE_Y + i * 1.2 - PAGE_H / 2,
                width:  PAGE_W,
                height: PAGE_H,
                transform: [{ translateX }, { translateY }, { rotate }, { scaleX }],
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Başlık */}
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
        <Text style={styles.title}>Kuran Yolu</Text>
        <View style={styles.dotsRow}>
          {dots.map((op, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: op }]} />
          ))}
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, width, height,
    backgroundColor: "#0a1628",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width:  width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    backgroundColor: "#d4a843",
    top:  BOOK_TOP + BOOK_SIZE * 0.175,
    left: width * 0.175,
  },
  bookImage: {
    position: "absolute",
    width:  BOOK_SIZE,
    height: BOOK_SIZE,
    top:  BOOK_TOP,
    left: (width - BOOK_SIZE) / 2,
  },

  // Shimmer şeridi
  shimmerWrap: {
    position: "absolute",
    top:    BOOK_TOP - 10,
    left:   0,
    height: BOOK_SIZE + 20,
    flexDirection: "row",
  },
  shimmerStrip: {
    height: "100%",
    backgroundColor: "#ffd764",
  },

  // Köşe ışık huzmesi: sol üst köşeden çapraz inen ince dikdörtgen
  ray: {
    position: "absolute",
    top:  -20,
    left: -20,
    width:  width * 0.55,
    height: height * 0.40,
    backgroundColor: "#ffe066",
    borderRadius: 4,
    transform: [{ rotate: "35deg" }, { translateX: -width * 0.18 }],
  },

  page: {
    position: "absolute",
    backgroundColor: "#f5e5c0",
    borderRadius: 2,
    shadowColor: "#b8860b",
    shadowOffset: { width: -2, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  titleContainer: {
    position: "absolute",
    bottom: 72, left: 0, right: 0,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#d4a843",
    letterSpacing: 1.5,
  },
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: "#d4a843",
  },
});
