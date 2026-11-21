import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Pressable, ScrollView, TextInput, Alert,
} from "react-native";
import { storage } from "../lib/storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../hooks/useColors";
import { useKeepAwakeSafe } from "../hooks/useKeepAwakeSafe";
import { getDevotionalSourceLabel } from "../lib/sourceLabels";
import { useStrings, useLang, fmt } from "../i18n";
import { localizedTranslit } from "../lib/translitEn";
import componentStrings from "../i18n/strings/components";
import { Badge, Button, CloseButton, radius } from "./ui";

// Route açıkken ekran uyanık kalır; kapanıp unmount olunca serbest bırakılır.
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

const BEAD_COUNT = 40;

const BeadRing = React.memo(function BeadRing({
  pct,
  ringSize,
  trackColor,
  activeColor,
}: {
  pct: number;
  ringSize: number;
  trackColor: string;
  activeColor: string;
}) {
  const center    = ringSize / 2;
  const radius    = ringSize / 2 - 10;
  const beadSize  = 8;
  const activeCnt = Math.round(pct * BEAD_COUNT);

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
              backgroundColor: i < activeCnt ? activeColor : trackColor,
            }}
          />
        );
      })}
    </View>
  );
});

export function TasbihScreen({ onClose }: { onClose: () => void }) {
  const c      = useColors();
  const t      = useStrings(componentStrings);
  const lang   = useLang();
  // Hazır zikir adları Türkçe okunuşla saklanır (anahtar); yalnız görüntüde çevrilir.
  const zName  = (n: string) => localizedTranslit(n, lang);
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
  const [stateLoaded,       setStateLoaded]        = useState(false);
  const pendingSaveRef = useRef<(() => void) | null>(null);

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
      .then(raw => { if (raw) setSavedList(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  // Aktif sayımı + hazır zikir hedef override'larını yükle
  useEffect(() => {
    Promise.all([storage.getString(STATE_KEY), storage.getString(PRESET_KEY)])
      .then(([rawState, rawPreset]) => {
        let overrides: Record<string, number> = {};
        if (rawPreset) { try { overrides = JSON.parse(rawPreset); setTargetOverrides(overrides); } catch { /* yoksay */ } }
        if (!rawState) return;
        const st = JSON.parse(rawState) as Partial<{ zikirIdx: number; count: number; tur: number; customName: string; customTarget: number }>;
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
      .catch(() => {})
      .finally(() => setStateLoaded(true));
  }, []);

  // Aktif sayımı kaydet (debounce — her çekişte disk yazımını önler)
  useEffect(() => {
    if (!stateLoaded) return;
    const save = () => {
      storage.setString(STATE_KEY, JSON.stringify({ zikirIdx, count, tur, customName, customTarget })).catch(() => {});
    };
    pendingSaveRef.current = save;
    const t = setTimeout(() => {
      save();
      pendingSaveRef.current = null;
    }, 400);
    return () => clearTimeout(t);
  }, [stateLoaded, zikirIdx, count, tur, customName, customTarget]);

  // Route kapanırken debounce süresi dolmamış son sayımı da koru.
  useEffect(() => () => {
    pendingSaveRef.current?.();
    pendingSaveRef.current = null;
  }, []);

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
    const isim  = customName.trim() || t.customDefault;
    const hedef = customTarget;
    Alert.alert(
      t.save,
      fmt(t.saveConfirm, { name: isim, n: hedef }),
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.save,
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
  }, [customName, customTarget, t]);

  const deleteCustom = useCallback((idx: number, isim: string) => {
    Alert.alert(
      t.deleteDhikrTitle,
      fmt(t.deleteDhikrBody, { name: isim }),
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
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

  const RING_SIZE  = 172;
  const CIRCLE_SZ  = 132;

  return (
    <>
      <KeepAwakeWhileOpen />
      <View style={[m.screen, {
        backgroundColor: c.bg,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 14,
      }]}>

        {/* ── Başlık ── */}
        <View style={m.header}>
          <View style={m.headerLeft}>
            <Text style={[m.headerTitle, { color: c.text }]}>{t.tasbih}</Text>
            {tur > 0 && (
              <Badge label={fmt(t.turBadge, { n: tur })} tone="emerald" style={{ alignSelf: "center" }} />
            )}
          </View>
          <CloseButton onPress={onClose} accessibilityLabel={t.close} />
        </View>

        {/* ── Zikir Seçici ── */}
        <View style={{ flexShrink: 0 }}>
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
                accessibilityLabel={z.ozel ? t.customLabel : zName(z.isim)}
                style={[m.pill, {
                  backgroundColor: active ? c.greenBg : c.card,
                  borderColor: active ? c.greenBorder : c.border,
                }]}
              >
                {/* Pil kutusu en az 125×80 — uzun zikir adları çok satıra sarar */}
                <Text style={[m.pillLabel, { color: active ? c.greenText : c.text }]} maxFontSizeMultiplier={1.3}>{z.ozel ? t.customLabel : zName(z.isim)}</Text>
                <Text style={[m.pillTarget, { color: active ? c.greenText : c.textMuted }]} maxFontSizeMultiplier={1.3}>
                  ×{z.ozel ? customTarget : (targetOverrides[z.isim] ?? z.hedef)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>

        {/* ── Arapça / Özel ── */}
        {isOzel ? (
          <View style={[m.arabicCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <TextInput
              style={[m.customNameInput, { color: c.text, borderColor: c.border }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder={t.customNamePlaceholder}
              placeholderTextColor={c.textMuted}
            />
            <View style={m.customTargetRow}>
              <Text style={{ fontSize: 13, color: c.textMuted }}>{t.targetLabel}</Text>
              <TextInput
                style={[m.customTargetInput, { color: c.text, borderColor: c.border }]}
                value={customTargetInput}
                onChangeText={applyCustomTarget}
                onBlur={checkTargetReached}
                onSubmitEditing={checkTargetReached}
                keyboardType="number-pad"
                maxLength={4}
                selectTextOnFocus
                accessibilityLabel={t.targetCountInputA11y}
                accessibilityHint={t.targetCountInputHint}
              />
              <Button
                variant="primary"
                label={t.save}
                onPress={saveCustom}
                accessibilityLabel={t.saveCustomA11y}
                style={m.saveBtn}
              />
            </View>
            {savedList.length > 0 && (
              <View style={[m.savedSep, { borderTopColor: c.border }]}>
                {savedList.map((z, i) => (
                  <View key={i}
                    style={[m.savedRow, { backgroundColor: c.cardAlt }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => selectSaved(z)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={fmt(t.selectDhikrA11y, { name: z.isim })}>
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
                        accessibilityLabel={fmt(t.dhikrTargetInputA11y, { name: z.isim })}
                        accessibilityHint={t.targetCountInputHint}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => { setEditTargetIdx(i); setEditTargetVal(String(z.hedef)); }}
                        hitSlop={6} activeOpacity={0.7}
                        style={m.inlineEditBtn}
                        accessibilityRole="button" accessibilityLabel={t.editTargetA11y}
                      >
                        <Text style={[m.savedHedef, { color: c.textMuted }]}>×{z.hedef}</Text>
                        <Ionicons name="pencil-outline" size={13} color={c.textMuted} accessible={false} importantForAccessibility="no" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => deleteCustom(i, z.isim)} hitSlop={8} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={fmt(t.deleteDhikrA11y, { name: z.isim })}>
                      <Ionicons name="close-circle" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[m.arabicCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[m.arabicText, { color: c.text }]}>{zikir.arapca}</Text>
            <View style={m.presetSubRow}>
              <Text style={[m.arabicSub, { color: c.textMuted, marginTop: 0 }]}>{zName(zikir.isim)} · {sourceLabel} · </Text>
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
                  accessibilityLabel={fmt(t.dhikrTargetInputA11y, { name: zName(zikir.isim) })}
                  accessibilityHint={t.targetCountInputHint}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => { setEditingPreset(true); setPresetTargetInput(String(target)); }}
                  hitSlop={6} activeOpacity={0.7}
                  style={m.inlineEditBtn}
                  accessibilityRole="button" accessibilityLabel={t.editTargetA11y}
                >
                  <Text style={[m.arabicSub, { color: c.accent, fontWeight: "700", marginTop: 0 }]}>
                    {fmt(t.timesEdit, { n: target })}
                  </Text>
                  <Ionicons name="pencil-outline" size={14} color={c.accent} accessible={false} importantForAccessibility="no" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Bead Ring + Sayaç ── */}
        <View style={m.circleArea}>
          <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
            <BeadRing pct={pct} ringSize={RING_SIZE} trackColor={c.border} activeColor={c.accent} />
            <Animated.View style={[m.circle, {
              width: CIRCLE_SZ, height: CIRCLE_SZ, borderRadius: CIRCLE_SZ / 2,
              backgroundColor: completing ? c.greenBg : c.card,
              borderColor: completing ? c.goldText : c.border,
              transform: [{ scale: scaleAnim }],
            }]}>
              {/* Daire sabit 132px — sayaç metinleri sistem ölçeğinden sınırlı büyür */}
              <Text style={[m.countNum, { color: c.text }]} maxFontSizeMultiplier={1.1}>{count}</Text>
              <Text style={[m.countDen, { color: c.textMuted }]} maxFontSizeMultiplier={1.2}>/ {target}</Text>
              {completing && <Text style={[m.doneText, { color: c.greenText }]} maxFontSizeMultiplier={1.2}>{t.done}</Text>}
            </Animated.View>
          </View>
        </View>

        <Text style={[m.progInfo, { color: c.textMuted, textAlign: "center", marginBottom: 8 }]}>
          {count === 0 ? t.startPulling : completing ? t.congrats : fmt(t.remaining, { n: Math.max(target - count, 0) })}
        </Text>

        {/* ── Çek Butonu ── */}
        <View style={m.tapArea}>
          <Animated.View style={{ transform: [{ scale: tapAnim }] }}>
            <Pressable
              onPress={tap}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.pullA11y, { name: isOzel ? (customName || t.customDhikr) : zName(zikir.isim) })}
              accessibilityHint={`${count} / ${target}`}
              style={({ pressed }) => [
                m.tapBtn,
                { backgroundColor: c.card, borderColor: c.goldText, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {/* Buton sabit 120px daire — metinler sistem ölçeğinden sınırlı büyür */}
              {isOzel && customName
                ? <Text style={[m.tapCustomName, { color: c.goldText }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{customName}</Text>
                : <Text style={[m.tapArabic, { color: c.goldText }]} maxFontSizeMultiplier={1.2}>اللَّه</Text>
              }
              <Text style={[m.tapLabel, { color: c.goldText }]} maxFontSizeMultiplier={1.2}>{t.pull}</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Aksiyonlar ── */}
        <View style={m.actions}>
          <TouchableOpacity onPress={resetCount} style={[m.actionBtn, { borderColor: c.errorBorder }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.resetCountA11y}>
            <Ionicons name="refresh" size={13} color={c.errorText} />
            <Text style={[m.actionText, { color: c.errorText }]}>{t.resetCount}</Text>
          </TouchableOpacity>
          {tur > 0 && (
            <TouchableOpacity onPress={resetAll} style={[m.actionBtn, { borderColor: c.border }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t.resetAllA11y}>
              <Ionicons name="trash-outline" size={13} color={c.textMuted} />
              <Text style={[m.actionText, { color: c.textMuted }]}>{t.resetAll}</Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </>
  );
}

const m = StyleSheet.create({
  screen:      { flex: 1, paddingHorizontal: 20 },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 19, fontWeight: "700" },

  presetsRow:  { paddingBottom: 12, gap: 7, flexDirection: "row" },
  pill:        { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 80, minWidth: 125, maxWidth: 170, gap: 3 },
  pillLabel:   { fontSize: 13, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  pillTarget:  { fontSize: 11, fontWeight: "600" },

  arabicCard:  { borderRadius: radius.lg, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", marginBottom: 18 },
  arabicText:  { fontSize: 28, fontFamily: "Amiri", writingDirection: "rtl", textAlign: "center", lineHeight: 46 },
  arabicSub:   { fontSize: 11, marginTop: 2, textAlign: "center" },
  presetSubRow:{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 2 },
  inlineEditBtn:{ flexDirection: "row", alignItems: "center", gap: 4 },

  customNameInput:   { width: "100%", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, marginBottom: 8 },
  customTargetRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  customTargetInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 64, textAlign: "center" },
  saveBtn:           { marginLeft: "auto", minHeight: 44, paddingHorizontal: 16 },
  savedSep:          { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6, width: "100%" },
  savedRow:          { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 },
  savedIsim:         { flex: 1, fontSize: 13, fontWeight: "600" },
  savedHedef:        { fontSize: 12, fontWeight: "500" },
  savedHedefInput:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, width: 54, textAlign: "center" },

  circleArea:  { flex: 1, alignItems: "center", justifyContent: "center" },
  circle:      {
    borderWidth: 3,
    alignItems: "center", justifyContent: "center",
  },
  countNum:    { fontSize: 56, fontWeight: "900", lineHeight: 62 },
  countDen:    { fontSize: 14, fontWeight: "600" },
  doneText:    { fontSize: 11, fontWeight: "700", marginTop: 2 },
  progInfo:    { fontSize: 11, fontWeight: "500" },

  tapArea: { alignItems: "center", marginTop: 18, marginBottom: 2 },
  tapBtn:  {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2,
  },
  tapArabic:    { fontSize: 26, fontFamily: "Amiri", lineHeight: 38 },
  tapLabel:     { fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  tapCustomName:{ fontSize: 12, fontWeight: "700", textAlign: "center", maxWidth: 90, marginBottom: 2 },

  actions:    { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 6 },
  actionBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 48, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1.5 },
  actionText: { fontSize: 11, fontWeight: "700" },
});
