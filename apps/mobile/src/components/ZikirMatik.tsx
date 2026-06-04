import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, Animated, Platform, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../hooks/useColors";

// expo-haptics kuruluysa kullan, değilse/çalışmazsa sessizce geç
let Haptics: typeof import("expo-haptics") | null = null;
try { Haptics = require("expo-haptics"); } catch { Haptics = null; }

const DEFAULT_TARGET = 33;

export function ZikirMatik() {
  const c = useColors();
  const [open, setOpen]               = useState(false);
  const [count, setCount]             = useState(0);
  const [target, setTarget]           = useState(DEFAULT_TARGET);
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET));

  const reached   = target > 0 && count >= target;
  const remaining = Math.max(target - count, 0);

  // ── Geri bildirim: web → AudioContext tik, native → Haptics ──
  const audioCtxRef = useRef<any>(null);
  const feedback = useCallback(() => {
    if (Platform.OS === "web") {
      try {
        const AC = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
        if (!AC) return;
        let ctx = audioCtxRef.current;
        if (!ctx) { ctx = new AC(); audioCtxRef.current = ctx; }
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.09);
      } catch { /* sessiz */ }
    } else {
      try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* sessiz */ }
    }
  }, []);

  // ── Hedefe ulaşınca kısa pulse + (native) başarı haptiği ──
  const scale = useRef(new Animated.Value(1)).current;
  const prevReached = useRef(false);
  useEffect(() => {
    if (reached && !prevReached.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== "web") {
        try { Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* sessiz */ }
      }
    }
    prevReached.current = reached;
  }, [reached, scale]);

  const tap = useCallback(() => {
    setCount((p) => p + 1);
    feedback();
  }, [feedback]);

  const reset = useCallback(() => setCount(0), []);

  const applyTarget = useCallback((txt: string) => {
    const digits = txt.replace(/[^0-9]/g, "");
    setTargetInput(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n > 0) setTarget(n);
  }, []);

  return (
    <>
      {/* ── Ana sayfa tetikleyici kart ── */}
      <TouchableOpacity
        style={[trig.card, {
          backgroundColor: c.isDark ? c.cardAlt : "#f0fdf4",
          borderColor: c.isDark ? "#166534" : "#86efac",
        }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={trig.emoji}>📿</Text>
        <View style={{ flex: 1 }}>
          <Text style={[trig.label, { color: c.text }]}>Tasbih</Text>
          <Text style={[trig.sub, { color: c.textMuted }]}>Zikirmatik · dokun ve say</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </TouchableOpacity>

      {/* ── Tam ekran modal ── */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[m.screen, { backgroundColor: c.bg }]}>
          {/* Üst bar */}
          <View style={m.topBar}>
            <Text style={[m.title, { color: c.text }]}>📿 Tasbih</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12} style={m.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Hedef + kalan */}
          <View style={[m.targetRow, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[m.targetLabel, { color: c.textMuted }]}>Hedef</Text>
            <TextInput
              style={[m.targetInput, { color: c.text, borderColor: c.border }]}
              value={targetInput}
              onChangeText={applyTarget}
              keyboardType="number-pad"
              maxLength={5}
              selectTextOnFocus
            />
            <View style={{ flex: 1 }} />
            <Text style={[m.remaining, { color: reached ? "#059669" : c.textMuted }]}>
              Kalan: {remaining}
            </Text>
          </View>

          {/* Orta: büyük sayı göstergesi */}
          <View style={m.center}>
            <Animated.View style={[m.countCircle, {
              borderColor: reached ? "#059669" : (c.isDark ? "#1f3d2f" : "#d1fae5"),
              backgroundColor: reached ? (c.isDark ? "#052e1c" : "#ecfdf5") : c.card,
              transform: [{ scale }],
            }]}>
              <Text style={[m.countText, { color: reached ? "#10b981" : c.text }]}>{count}</Text>
              <Text style={[m.countSub, { color: c.textMuted }]}>/ {target}</Text>
              {reached && <Text style={m.reachedText}>✓ Tamamlandı</Text>}
            </Animated.View>
          </View>

          {/* Büyük yuvarlak tasbih butonu */}
          <View style={m.tapWrap}>
            <Pressable
              onPress={tap}
              style={({ pressed }) => [
                m.tapBtn,
                { backgroundColor: reached ? "#047857" : "#059669", transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Ionicons name="add" size={40} color="#fff" />
              <Text style={m.tapBtnText}>Çek</Text>
            </Pressable>
          </View>

          {/* Sıfırla */}
          <TouchableOpacity onPress={reset} style={m.resetBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={16} color="#dc2626" />
            <Text style={m.resetText}>Sıfırla</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const trig = StyleSheet.create({
  card:  { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  emoji: { fontSize: 24 },
  label: { fontSize: 14, fontWeight: "700" },
  sub:   { fontSize: 11, marginTop: 1 },
});

const m = StyleSheet.create({
  screen:   { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  topBar:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title:    { fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },

  targetRow:   { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  targetLabel: { fontSize: 13, fontWeight: "600" },
  targetInput: { minWidth: 56, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, fontWeight: "700", textAlign: "center" },
  remaining:   { fontSize: 13, fontWeight: "600" },

  center:      { flex: 1, alignItems: "center", justifyContent: "center" },
  countCircle: {
    width: 220, height: 220, borderRadius: 110, borderWidth: 5,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#059669", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  countText:   { fontSize: 76, fontWeight: "800", lineHeight: 84 },
  countSub:    { fontSize: 16, fontWeight: "600", marginTop: -4 },
  reachedText: { fontSize: 13, fontWeight: "700", color: "#059669", marginTop: 6 },

  tapWrap: { alignItems: "center", marginTop: 8 },
  tapBtn: {
    width: 168, height: 168, borderRadius: 84,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#059669", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  tapBtnText: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 1, marginTop: 2 },

  resetBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "center", marginTop: 18, paddingVertical: 8, paddingHorizontal: 16 },
  resetText: { fontSize: 14, fontWeight: "600", color: "#dc2626" },
});
