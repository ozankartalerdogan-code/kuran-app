import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Platform, Pressable, ScrollView, TextInput, Alert,
} from "react-native";
import { storage } from "../lib/storage";
import { parseSavedZikirList, parseZikirPresetTargets, parseZikirState } from "../lib/storageSchemas";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../hooks/useColors";
import { useKeepAwakeSafe } from "../hooks/useKeepAwakeSafe";
import { getDevotionalSourceLabel } from "../lib/sourceLabels";

// Modal içeriği yalnız görünürken mount olur → zikir çekilirken ekran uyanık
// kalır, modal kapanınca serbest bırakılır. (Hook doğrudan TasbihModal gövdesine
// konsaydı bileşen hep mount olduğu için ekran sürekli uyanık kalırdı.)
function KeepAwakeWhileOpen() {
  useKeepAwakeSafe();
  return null;
}

let Haptics: typeof import("expo-haptics") | null = null;
try { Haptics = require("expo-haptics"); } catch { Haptics = null; }

const STORAGE_KEY = "tespih_custom_zikirler";
const STATE_KEY   = "tespih_state";   // aktif sayım (count/tur/seçili zikir) — uygulama kapansa da korunur
const PRESET_KEY  = "tespih_preset_hedefler"; // hazır zikirlerin kullanıcı tarafından değiştirilmiş hedefleri
interface SavedZikir { isim: string; hedef: number }

interface Zikir {
  isim: string;
  arapca: string;
  hedef: number;
  kaynak: string;
  ozel?: boolean;
}

const ZİKİRLER: Zikir[] = [
  { isim: "Sübhanallah",                      arapca: "سُبْحَانَ اللهِ",                             hedef: 33,  kaynak: "Buhari, Müslim" },
  { isim: "Elhamdülillah",                     arapca: "اَلْحَمْدُ لِلّٰهِ",                           hedef: 33,  kaynak: "Buhari, Müslim" },
  { isim: "Allahu Ekber",                      arapca: "اَللّٰهُ اَكْبَرُ",                             hedef: 33,  kaynak: "Buhari, Müslim" },
  { isim: "La ilahe illallah",                 arapca: "لَا إِلَهَ إِلَّا اللهُ",                     hedef: 100, kaynak: "Buhari, Müslim" },
  { isim: "Estağfirullah",                     arapca: "أَسْتَغْفِرُ اللهَ",                           hedef: 100, kaynak: "Müslim" },
  { isim: "Sübhanallahi ve bihamdihi",         arapca: "سُبْحَانَ اللهِ وَبِحَمْدِهِ",                hedef: 100, kaynak: "Buhari" },
  { isim: "Sübhanallahil azim",                arapca: "سُبْحَانَ اللهِ الْعَظِيمِ",                  hedef: 100, kaynak: "Buhari" },
  { isim: "La havle ve la kuvvete illa billah", arapca: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ",   hedef: 100, kaynak: "Buhari, Müslim" },
  { isim: "Salavat",                           arapca: "اللَّهُمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّدٍ", hedef: 10,  kaynak: "Müslim" },
  { isim: "Özel",                              arapca: "",                                             hedef: 33,  kaynak: "", ozel: true },
];

const LACIVERT  = "#0a1628";
const ALTIN     = "#c9a84c";
const ACCENT    = "#059669";
const BEAD_COUNT = 40;

function interpColor(t: number): string {
  const r = Math.round(5   + (201 - 5)   * t);
  const g = Math.round(150 + (168 - 150) * t);
  const b = Math.round(105 + (76  - 105) * t);
  return `rgb(${r},${g},${b})`;
}

const BeadRing = React.memo(function BeadRing({ pct, ringSize, trackColor }: { pct: number; ringSize: number; trackColor: string }) {
  const center    = ringSize / 2;
  const radius    = ringSize / 2 - 10;
  const beadSize  = 8;
  const activeCnt = Math.round(pct * BEAD_COUNT);
  const fillColor = interpColor(pct);

  return (
    <View style={{ width: ringSize, height: ringSize, position: "absolute" }}>
      {Array.from({ length: BEAD_COUNT }, (_, i) => {
        const angle = (i / BEAD_COUNT) * Math.PI * 2 - Math.PI / 2;
        const x = center + radius * Math.cos(angle) - beadSize / 2;
        const y = center + radius * Math.sin(angle) - beadSize / 2;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: x, top: y,
              width: beadSize, height: beadSize, borderRadius: beadSize / 2,
              backgroundColor: i < activeCnt ? fillColor : trackColor,
            }}
          />
        );
      })}
    </View>
  );
});

export function TasbihModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c      = useColors();
  const insets = useSafeAreaInsets();

  const [zikirIdx,          setZikirIdx]          = useState(0);
  const [count,             setCount]              = useState(0);
  const [tur,               setTur]                = useState(0);
  const [completing,        setCompleting]         = useState(false);
  const [customName,        setCustomName]         = useState("");
  const [customTarget,      setCustomTarget]       = useState(33);
  const [customTargetInput, setCustomTargetInput]  = useState("33");
  const [savedList,         setSavedList]          = useState<SavedZikir[]>([]);
  const [editTargetIdx,     setEditTargetIdx]      = useState<number | null>(null);
  const [editTargetVal,     setEditTargetVal]      = useState("");
  const [targetOverrides,   setTargetOverrides]    = useState<Record<string, number>>({}); // hazır zikir → özel hedef
  const [editingPreset,     setEditingPreset]      = useState(false);
  const [presetTargetInput, setPresetTargetInput]  = useState("");

  const zikir  = ZİKİRLER[zikirIdx];
  const isOzel = zikir.ozel === true;
  const target = isOzel ? customTarget : (targetOverrides[zikir.isim] ?? zikir.hedef);
  const pct    = target > 0 ? Math.min(count / target, 1) : 0;
  const sourceLabel = getDevotionalSourceLabel({ title: zikir.isim, source: zikir.kaynak });

  const scaleAnim     = useRef(new Animated.Value(1)).current;
  const tapAnim       = useRef(new Animated.Value(1)).current;
  const completingRef = useRef(false);
  const autoResetRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  // Hedefi ref'te tut: tamamlanma yalnız sayım ARTINCA tetiklensin, hedef değişince değil.
  const targetRef     = useRef(target);
  targetRef.current   = target;

  useEffect(() => () => { if (autoResetRef.current) clearTimeout(autoResetRef.current); }, []);

  useEffect(() => {
    storage.getString(STORAGE_KEY)
      .then(raw => setSavedList(parseSavedZikirList(raw)))
      .catch(() => {});
  }, []);

  // Aktif sayımı + hazır zikir hedef override'larını yükle
  useEffect(() => {
    Promise.all([storage.getString(STATE_KEY), storage.getString(PRESET_KEY)])
      .then(([rawState, rawPreset]) => {
        const overrides = parseZikirPresetTargets(rawPreset);
        setTargetOverrides(overrides);
        const st = parseZikirState(rawState);
        if (!st) return;
        const idx = typeof st.zikirIdx === "number" && st.zikirIdx >= 0 && st.zikirIdx < ZİKİRLER.length ? st.zikirIdx : 0;
        const ct  = typeof st.customTarget === "number" && st.customTarget > 0 ? st.customTarget : 33;
        if (typeof st.customName === "string") setCustomName(st.customName);
        setCustomTarget(ct);
        setCustomTargetInput(String(ct));
        setZikirIdx(idx);
        if (typeof st.tur === "number" && st.tur >= 0) setTur(st.tur);
        // Tamamlanma anında kapanmışsa (count == hedef) yeniden tetiklenmesin → 0'dan başlat.
        const z = ZİKİRLER[idx];
        const loadedTarget = z.ozel ? ct : (overrides[z.isim] ?? z.hedef);
        const cnt = typeof st.count === "number" && st.count > 0 ? st.count : 0;
        setCount(cnt >= loadedTarget ? 0 : cnt);
      })
      .catch(() => {});
  }, []);

  // Aktif sayımı kaydet (debounce — her çekişte disk yazımını önler)
  useEffect(() => {
    const t = setTimeout(() => {
      storage.setString(STATE_KEY, JSON.stringify({ zikirIdx, count, tur, customName, customTarget })).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [zikirIdx, count, tur, customName, customTarget]);

  const playFeedback = useCallback((success: boolean) => {
    if (Platform.OS === "web") {
      try {
        // Eski Safari webkitAudioContext'i DOM tiplerinde yok — yalnız o alan için ek tip.
        const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
        const AC = g.AudioContext ?? g.webkitAudioContext;
        if (!AC) return;
        let ctx = audioCtxRef.current;
        if (!ctx) { ctx = new AC(); audioCtxRef.current = ctx; }
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = success ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } catch { /* sessiz */ }
    } else {
      try {
        if (success) Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else         Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch { /* sessiz */ }
    }
  }, []);

  const triggerComplete = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    setTur(t => t + 1);
    playFeedback(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.18, duration: 140, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    autoResetRef.current = setTimeout(() => {
      setCount(0);
      setCompleting(false);
      completingRef.current = false;
    }, 1600);
  }, [playFeedback, scaleAnim]);

  // Sayım artışında tamamlanmayı kontrol et. target deps'te DEĞİL → hedef
  // yazılırken (ör. "10" için önce "1") erken tetiklenmez.
  useEffect(() => {
    if (count >= targetRef.current && count > 0) triggerComplete();
  }, [count, triggerComplete]);

  // Hedef alanı düzenlenip bitince: sayımı zaten geçmişsen tamamla.
  const checkTargetReached = useCallback(() => {
    if (count >= targetRef.current && count > 0) triggerComplete();
  }, [count, triggerComplete]);

  const tap = useCallback(() => {
    if (completingRef.current) {
      // Kutlama (1.6 sn) sırasında gelen dokunuşu yutma: akıcı zikir çeken
      // kullanıcının çekişi kaybolmasın — kutlamayı bitir, yeni tura 1'den başla.
      if (autoResetRef.current) { clearTimeout(autoResetRef.current); autoResetRef.current = null; }
      completingRef.current = false;
      setCompleting(false);
      setCount(1);
    } else {
      setCount(p => p + 1);
    }
    playFeedback(false);
    Animated.sequence([
      Animated.timing(tapAnim, { toValue: 0.92, duration: 65, useNativeDriver: true }),
      Animated.spring(tapAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [playFeedback, tapAnim]);

  const clearTimer = useCallback(() => {
    if (autoResetRef.current) { clearTimeout(autoResetRef.current); autoResetRef.current = null; }
  }, []);

  const resetCount = useCallback(() => {
    clearTimer(); setCount(0); setCompleting(false); completingRef.current = false;
  }, [clearTimer]);

  const resetAll = useCallback(() => {
    clearTimer(); setCount(0); setTur(0); setCompleting(false); completingRef.current = false;
  }, [clearTimer]);

  const selectZikir = useCallback((idx: number) => {
    clearTimer(); setZikirIdx(idx); setCount(0); setTur(0); setCompleting(false); completingRef.current = false;
    setEditingPreset(false);
  }, [clearTimer]);

  // Hazır zikrin hedefini kullanıcı değerine ayarla (override) ve kalıcı kaydet.
  const commitPresetTarget = useCallback(() => {
    setEditingPreset(false);
    const n = parseInt(presetTargetInput, 10);
    if (isNaN(n) || n <= 0) return;
    setTargetOverrides(prev => {
      const next = { ...prev, [zikir.isim]: n };
      storage.setString(PRESET_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    if (count >= n && count > 0) triggerComplete(); // yeni hedefi zaten geçmişse tamamla
  }, [presetTargetInput, zikir.isim, count, triggerComplete]);

  const applyCustomTarget = useCallback((val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    setCustomTargetInput(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n > 0) setCustomTarget(n);
  }, []);

  const saveCustom = useCallback(() => {
    const isim  = customName.trim() || "Özel Zikir";
    const hedef = customTarget;
    Alert.alert(
      "Kaydet",
      `"${isim}" (×${hedef}) kaydedilsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaydet",
          onPress: () => {
            setSavedList(prev => {
              const filtered = prev.filter(z => z.isim !== isim);
              const next = [...filtered, { isim, hedef }];
              storage.setString(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
          },
        },
      ]
    );
  }, [customName, customTarget]);

  const deleteCustom = useCallback((idx: number, isim: string) => {
    Alert.alert(
      "Zikiri Sil",
      `"${isim}" silinsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            setSavedList(prev => {
              const next = prev.filter((_, i) => i !== idx);
              storage.setString(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
          },
        },
      ]
    );
  }, []);

  const selectSaved = useCallback((z: SavedZikir) => {
    clearTimer();
    setCustomName(z.isim);
    setCustomTarget(z.hedef);
    setCustomTargetInput(String(z.hedef));
    // Taze sayıma hazır — hedef sayı yüklenir, kullanıcı isterse input'tan değiştirebilir.
    setCount(0); setTur(0); setCompleting(false); completingRef.current = false;
  }, [clearTimer]);

  // Kayıtlı zikrin hedef sayısını satır içinde düzenle ve kalıcı kaydet.
  const commitSavedTarget = useCallback((idx: number) => {
    setSavedList(prev => {
      const n = parseInt(editTargetVal, 10);
      const next = (!isNaN(n) && n > 0) ? prev.map((z, i) => (i === idx ? { ...z, hedef: n } : z)) : prev;
      storage.setString(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setEditTargetIdx(null);
  }, [editTargetVal]);

  const bgColor    = c.isDark ? "#0a0f1a" : "#f8f9fc";
  const trackColor = c.isDark ? "#1e2535" : "#e2e8f0";
  const RING_SIZE  = 172;
  const CIRCLE_SZ  = 132;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeepAwakeWhileOpen />
      <View style={[m.screen, {
        backgroundColor: bgColor,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 14,
      }]}>

        {/* ── Başlık ── */}
        <View style={m.header}>
          <View style={m.headerLeft}>
            <Text style={{ fontSize: 22 }}>📿</Text>
            <Text style={[m.headerTitle, { color: c.text }]}>Tespih</Text>
            {tur > 0 && (
              <View style={[m.turBadge, { backgroundColor: LACIVERT }]}>
                <Text style={[m.turBadgeText, { color: ALTIN }]}>{tur} tur</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Kapat">
            <Ionicons name="close-circle" size={26} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Zikir Seçici ── */}
        <View style={{ height: 90 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.presetsRow}>
          {ZİKİRLER.map((z, i) => {
            const active = zikirIdx === i;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => selectZikir(i)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={z.isim}
                style={[m.pill, {
                  backgroundColor: active ? LACIVERT : (c.isDark ? "#151c2e" : "#f1f5f9"),
                  borderColor: active ? ALTIN : (c.isDark ? "#252f45" : "#cbd5e1"),
                }]}
              >
                {/* Pil kutusu sabit 125×80 — sistem yazı ölçeği sınırlanmazsa metin taşar */}
                <Text style={[m.pillLabel, { color: active ? ALTIN : c.text }]} maxFontSizeMultiplier={1.2}>{z.isim}</Text>
                <Text style={[m.pillTarget, { color: active ? "rgba(201,168,76,0.75)" : c.textMuted }]} maxFontSizeMultiplier={1.2}>
                  ×{z.ozel ? customTarget : (targetOverrides[z.isim] ?? z.hedef)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>

        {/* ── Arapça / Özel ── */}
        {isOzel ? (
          <View style={[m.arabicCard, { backgroundColor: c.card, borderColor: c.isDark ? "#252f45" : "#cbd5e1" }]}>
            <TextInput
              style={[m.customNameInput, { color: c.text, borderColor: c.border }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Zikir adı (isteğe bağlı)"
              placeholderTextColor={c.textMuted}
            />
            <View style={m.customTargetRow}>
              <Text style={{ fontSize: 13, color: c.textMuted }}>Hedef sayı:</Text>
              <TextInput
                style={[m.customTargetInput, { color: c.text, borderColor: c.border }]}
                value={customTargetInput}
                onChangeText={applyCustomTarget}
                onBlur={checkTargetReached}
                onSubmitEditing={checkTargetReached}
                keyboardType="number-pad"
                maxLength={4}
                selectTextOnFocus
              />
              <TouchableOpacity onPress={saveCustom} style={[m.saveBtn, { backgroundColor: LACIVERT }]} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Özel zikri kaydet">
                <Text style={m.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
            {savedList.length > 0 && (
              <View style={[m.savedSep, { borderTopColor: c.border }]}>
                {savedList.map((z, i) => (
                  <View key={i}
                    style={[m.savedRow, { backgroundColor: c.isDark ? "#151c2e" : "#f1f5f9" }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => selectSaved(z)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${z.isim} zikrini seç`}>
                      <Text style={[m.savedIsim, { color: c.text }]} numberOfLines={1}>{z.isim}</Text>
                    </TouchableOpacity>
                    {editTargetIdx === i ? (
                      <TextInput
                        style={[m.savedHedefInput, { color: c.text, borderColor: c.border }]}
                        value={editTargetVal}
                        onChangeText={v => setEditTargetVal(v.replace(/[^0-9]/g, ""))}
                        onBlur={() => commitSavedTarget(i)}
                        onSubmitEditing={() => commitSavedTarget(i)}
                        keyboardType="number-pad"
                        maxLength={4}
                        autoFocus
                        selectTextOnFocus
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => { setEditTargetIdx(i); setEditTargetVal(String(z.hedef)); }}
                        hitSlop={6} activeOpacity={0.7}
                        accessibilityRole="button" accessibilityLabel="Hedefi düzenle"
                      >
                        <Text style={[m.savedHedef, { color: c.textMuted }]}>×{z.hedef} ✎</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => deleteCustom(i, z.isim)} hitSlop={8} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${z.isim} zikrini sil`}>
                      <Ionicons name="close-circle" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[m.arabicCard, { backgroundColor: c.card, borderColor: c.isDark ? "#252f45" : "#cbd5e1" }]}>
            <Text style={[m.arabicText, { color: c.text }]}>{zikir.arapca}</Text>
            <View style={m.presetSubRow}>
              <Text style={[m.arabicSub, { color: c.textMuted }]}>{zikir.isim} · {sourceLabel} · </Text>
              {editingPreset ? (
                <TextInput
                  style={[m.savedHedefInput, { color: c.text, borderColor: c.border }]}
                  value={presetTargetInput}
                  onChangeText={v => setPresetTargetInput(v.replace(/[^0-9]/g, ""))}
                  onBlur={commitPresetTarget}
                  onSubmitEditing={commitPresetTarget}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <TouchableOpacity
                  onPress={() => { setEditingPreset(true); setPresetTargetInput(String(target)); }}
                  hitSlop={6} activeOpacity={0.7}
                  accessibilityRole="button" accessibilityLabel="Hedefi düzenle"
                >
                  <Text style={[m.arabicSub, { color: ACCENT, fontWeight: "700" }]}>{target} kez ✎</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Bead Ring + Sayaç ── */}
        <View style={m.circleArea}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
            <BeadRing pct={pct} ringSize={RING_SIZE} trackColor={trackColor} />
            <Animated.View style={[m.circle, {
              width: CIRCLE_SZ, height: CIRCLE_SZ, borderRadius: CIRCLE_SZ / 2,
              backgroundColor: completing ? (c.isDark ? "#0d1f0d" : "#ecfdf5") : c.card,
              borderColor: completing ? ALTIN : (c.isDark ? "#1f2f45" : "#e2e8f0"),
              shadowColor: completing ? ALTIN : LACIVERT,
              transform: [{ scale: scaleAnim }],
            }]}>
              {/* Daire sabit 132px — sayaç metinleri sistem ölçeğinden sınırlı büyür */}
              <Text style={[m.countNum, { color: completing ? ALTIN : c.text }]} maxFontSizeMultiplier={1.1}>{count}</Text>
              <Text style={[m.countDen, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>/ {target}</Text>
              {completing && <Text style={[m.doneText, { color: ALTIN }]} maxFontSizeMultiplier={1.2}>✓ Tamam</Text>}
            </Animated.View>
          </View>
        </View>

        <Text style={[m.progInfo, { color: c.textMuted, textAlign: "center", marginBottom: 8 }]}>
          {count === 0 ? "Çekmeye başla" : completing ? "Tebrikler! 🎉" : `${Math.max(target - count, 0)} kaldı`}
        </Text>

        {/* ── Çek Butonu ── */}
        <View style={m.tapArea}>
          <Animated.View style={{ transform: [{ scale: tapAnim }] }}>
            <Pressable
              onPress={tap}
              accessibilityRole="button"
              accessibilityLabel={`${isOzel ? (customName || "Özel zikir") : zikir.isim} çek`}
              accessibilityHint={`${count} / ${target}`}
              style={({ pressed }) => [m.tapBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              {/* Buton sabit 120px daire — metinler sistem ölçeğinden sınırlı büyür */}
              {isOzel && customName
                ? <Text style={m.tapCustomName} numberOfLines={1} maxFontSizeMultiplier={1.2}>{customName}</Text>
                : <Text style={m.tapArabic} maxFontSizeMultiplier={1.2}>اللَّه</Text>
              }
              <Text style={m.tapLabel} maxFontSizeMultiplier={1.2}>Çek</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Aksiyonlar ── */}
        <View style={m.actions}>
          <TouchableOpacity onPress={resetCount} style={[m.actionBtn, { borderColor: "#fca5a5" }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sayacı sıfırla">
            <Ionicons name="refresh" size={13} color="#dc2626" />
            <Text style={[m.actionText, { color: "#dc2626" }]}>Sayacı Sıfırla</Text>
          </TouchableOpacity>
          {tur > 0 && (
            <TouchableOpacity onPress={resetAll} style={[m.actionBtn, { borderColor: c.border }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Tümünü sıfırla">
              <Ionicons name="trash-outline" size={13} color={c.textMuted} />
              <Text style={[m.actionText, { color: c.textMuted }]}>Tümünü Sıfırla</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  screen:      { flex: 1, paddingHorizontal: 20 },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 19, fontWeight: "700" },
  turBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  turBadgeText:{ fontSize: 12, fontWeight: "700" },

  presetsRow:  { paddingBottom: 12, gap: 7, flexDirection: "row" },
  pill:        { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80, width: 125, gap: 3 },
  pillLabel:   { fontSize: 13, fontWeight: "700", textAlign: "center" },
  pillTarget:  { fontSize: 11, fontWeight: "600" },

  arabicCard:  { borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", marginBottom: 18 },
  arabicText:  { fontSize: 28, fontFamily: "Amiri", writingDirection: "rtl", textAlign: "center", lineHeight: 46 },
  arabicSub:   { fontSize: 11, marginTop: 2, textAlign: "center" },
  presetSubRow:{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 2 },

  customNameInput:   { width: "100%", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, marginBottom: 8 },
  customTargetRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  customTargetInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 64, textAlign: "center" },
  saveBtn:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, marginLeft: "auto" },
  saveBtnText:       { fontSize: 13, fontWeight: "700", color: ALTIN },
  savedSep:          { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6, width: "100%" },
  savedRow:          { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  savedIsim:         { flex: 1, fontSize: 13, fontWeight: "600" },
  savedHedef:        { fontSize: 12, fontWeight: "500" },
  savedHedefInput:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, width: 54, textAlign: "center" },

  circleArea:  { flex: 1, alignItems: "center", justifyContent: "center" },
  circle:      {
    borderWidth: 3,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  countNum:    { fontSize: 56, fontWeight: "900", lineHeight: 62 },
  countDen:    { fontSize: 14, fontWeight: "600" },
  doneText:    { fontSize: 11, fontWeight: "700", marginTop: 2 },
  progInfo:    { fontSize: 11, fontWeight: "500" },

  tapArea: { alignItems: "center", marginTop: 18, marginBottom: 2 },
  tapBtn:  {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    backgroundColor: LACIVERT,
    borderWidth: 2, borderColor: ALTIN,
    shadowColor: LACIVERT, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  tapArabic:    { fontSize: 26, color: ALTIN, fontFamily: "Amiri", lineHeight: 38 },
  tapLabel:     { fontSize: 15, fontWeight: "800", color: ALTIN, letterSpacing: 1 },
  tapCustomName:{ fontSize: 12, fontWeight: "700", color: ALTIN, textAlign: "center", maxWidth: 90, marginBottom: 2 },

  actions:    { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 6 },
  actionBtn:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  actionText: { fontSize: 11, fontWeight: "700" },
});
