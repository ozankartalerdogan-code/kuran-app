import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { api, type AyahDetailResponse } from "../../../src/lib/api";
import { useFavorites } from "../../../src/hooks/useFavorites";
import { useNotes }     from "../../../src/hooks/useNotes";
import { useStreak }    from "../../../src/hooks/useStreak";

// ── Favori Butonu ─────────────────────────────────────────────────────────────

function FavoriteButton({
  verseKey,
  isFav,
  onToggle,
}: {
  verseKey:  string;
  isFav:     boolean;
  onToggle:  () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, isFav && styles.actionBtnActive]}
      onPress={onToggle}
      activeOpacity={0.75}
      hitSlop={8}
    >
      <Text style={styles.actionBtnIcon}>{isFav ? "❤️" : "🤍"}</Text>
      <Text style={[styles.actionBtnLabel, isFav && styles.actionBtnLabelActive]}>
        {isFav ? "Favoride" : "Favori"}
      </Text>
    </TouchableOpacity>
  );
}

// ── Not Editörü ───────────────────────────────────────────────────────────────

function NoteEditor({
  verseKey,
  initialNote,
  onSave,
}: {
  verseKey:    string;
  initialNote: string;
  onSave:      (text: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState(initialNote);
  const [saving, setSaving] = useState(false);

  // initialNote dışarıdan değişince senkronize et
  useEffect(() => { setText(initialNote); }, [initialNote]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(text);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert("Notu Sil", "Bu ayet için yazdığın not silinecek.", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          await onSave("");
          setOpen(false);
        },
      },
    ]);
  }

  const hasNote = initialNote.trim().length > 0;

  return (
    <View style={styles.noteSection}>
      {/* Başlık + aç/kapat butonu */}
      <TouchableOpacity
        style={styles.noteSectionHeader}
        onPress={() => { setText(initialNote); setOpen((p) => !p); }}
        activeOpacity={0.75}
      >
        <View style={styles.noteLabelRow}>
          <Text style={styles.noteIcon}>📝</Text>
          <Text style={styles.sectionLabel}>
            {hasNote ? "Notun" : "Not Ekle"}
          </Text>
          {hasNote && <View style={styles.noteDot} />}
        </View>
        <Text style={styles.noteChevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Mevcut not önizlemesi */}
      {hasNote && !open && (
        <Text style={styles.notePreview} numberOfLines={2}>
          {initialNote}
        </Text>
      )}

      {/* Düzenleme alanı */}
      {open && (
        <View style={styles.noteEditor}>
          <TextInput
            style={styles.noteInput}
            value={text}
            onChangeText={setText}
            placeholder="Ayet hakkında notunu yaz…"
            placeholderTextColor="#a8a29e"
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.noteBtnRow}>
            {hasNote && (
              <TouchableOpacity
                style={styles.noteDeleteBtn}
                onPress={handleDelete}
                activeOpacity={0.75}
              >
                <Text style={styles.noteDeleteText}>Sil</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.noteSaveBtn, saving && styles.noteSaveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.75}
            >
              <Text style={styles.noteSaveBtnText}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function AyahDetailScreen() {
  const { surahId: rawS, ayahNumber: rawA } =
    useLocalSearchParams<{ surahId: string; ayahNumber: string }>();
  const surahId    = Number(rawS);
  const ayahNumber = Number(rawA);
  const verseKey   = `${surahId}:${ayahNumber}`;

  const [data, setData]       = useState<AyahDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Hooks
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { getNote, saveNote }             = useNotes();
  useStreak(); // Her ekran açılışında streak'i güncelle

  useEffect(() => {
    if (!surahId || !ayahNumber) return;
    setLoading(true);
    setError(null);
    api.ayah
      .get(surahId, ayahNumber)
      .then(setData)
      .catch(() => setError("Ayet yüklenemedi. Bağlantını kontrol et."))
      .finally(() => setLoading(false));
  }, [surahId, ayahNumber]);

  const navigate = useCallback((s: number, a: number) => {
    router.replace(`/ayah/${s}/${a}`);
  }, []);

  const handleToggleFav = useCallback(async () => {
    await toggleFav(verseKey);
  }, [verseKey, toggleFav]);

  const handleSaveNote = useCallback(async (text: string) => {
    await saveNote(verseKey, text);
  }, [verseKey, saveNote]);

  const headerTitle = data
    ? `${data.surahName} · ${data.ayahNumber}. Ayet`
    : "Ayet Detayı";

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Ayet Detayı" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Ayet yükleniyor…</Text>
        </View>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Stack.Screen options={{ title: "Hata" }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Veri yüklenemedi."}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isFav    = isFavorite(verseKey);
  const note     = getNote(verseKey);

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Arapça Metin */}
          <View style={styles.arabicBox}>
            <Text style={styles.arabicText}>{data.arabicText ?? "—"}</Text>
            <Text style={styles.verseKeyBadge}>{data.verseKey}</Text>
          </View>

          {/* Aksiyon çubuğu: Favori */}
          <View style={styles.actionRow}>
            <FavoriteButton
              verseKey={verseKey}
              isFav={isFav}
              onToggle={handleToggleFav}
            />
          </View>

          {/* Meal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Meal</Text>
            <Text style={styles.mealText}>
              {data.meal ?? "Meal verisi yok."}
            </Text>
          </View>

          {/* Not Editörü */}
          <NoteEditor
            verseKey={verseKey}
            initialNote={note}
            onSave={handleSaveNote}
          />

          {/* Kelime Kelime */}
          {data.words.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Kelime Kelime</Text>
              <View style={styles.wordsGrid}>
                {data.words.map((w) => (
                  <View key={w.wordIndex} style={styles.wordChip}>
                    <Text style={styles.wordArabic}>{w.arabic ?? "—"}</Text>
                    {w.meaningTr ? (
                      <Text style={styles.wordMeaning}>{w.meaningTr}</Text>
                    ) : null}
                    {w.pos ? (
                      <Text style={styles.wordPos}>{w.pos}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Navigasyon */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, !data.prevAyah && styles.navBtnDisabled]}
              onPress={() =>
                data.prevAyah &&
                navigate(data.prevAyah.surahId, data.prevAyah.ayahNumber)
              }
              disabled={!data.prevAyah}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnText, !data.prevAyah && styles.navBtnTextDisabled]}>
                ← Önceki
              </Text>
            </TouchableOpacity>

            <Text style={styles.navCenter}>
              {data.ayahNumber} / {data.verseCount}
            </Text>

            <TouchableOpacity
              style={[styles.navBtn, !data.nextAyah && styles.navBtnDisabled]}
              onPress={() =>
                data.nextAyah &&
                navigate(data.nextAyah.surahId, data.nextAyah.ayahNumber)
              }
              disabled={!data.nextAyah}
              activeOpacity={0.7}
            >
              <Text style={[styles.navBtnText, !data.nextAyah && styles.navBtnTextDisabled]}>
                Sonraki →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f1e4" },
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 20, backgroundColor: "#f7f1e4",
  },
  loadingText: { marginTop: 12, color: "#78716c", fontSize: 14 },
  errorText:   { color: "#dc2626", fontSize: 14, textAlign: "center" },

  backBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    minHeight: 44, justifyContent: "center",
    backgroundColor: "#059669", borderRadius: 8,
  },
  backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // ── Arapça ──
  arabicBox: {
    backgroundColor: "#ffffff", borderRadius: 12, padding: 20,
    marginBottom: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  arabicText: {
    fontSize: 32, lineHeight: 56, color: "#1c1917",
    fontFamily: "serif", textAlign: "right", writingDirection: "rtl", width: "100%",
  },
  verseKeyBadge: { marginTop: 8, fontSize: 11, color: "#a8a29e", fontWeight: "500" },

  // ── Aksiyon çubuğu ──
  actionRow: {
    flexDirection: "row", gap: 10, marginBottom: 10,
  },
  actionBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    backgroundColor: "#ffffff",
    borderWidth:    1,
    borderColor:    "#e7e5e4",
    borderRadius:   10,
    paddingHorizontal: 16,
    paddingVertical:   10,
    minHeight:      44,
    flex:           1,
    justifyContent: "center",
  },
  actionBtnActive: { backgroundColor: "#fff1f2", borderColor: "#fca5a5" },
  actionBtnIcon:  { fontSize: 18 },
  actionBtnLabel: { fontSize: 13, fontWeight: "600", color: "#44403c" },
  actionBtnLabelActive: { color: "#dc2626" },

  // ── Bölümler ──
  section: {
    backgroundColor: "#ffffff", borderRadius: 12,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#059669",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
  },
  mealText: { fontSize: 15, lineHeight: 26, color: "#292524" },

  // ── Not Editörü ──
  noteSection: {
    backgroundColor: "#ffffff", borderRadius: 12,
    borderWidth: 1, borderColor: "#e7e5e4",
    marginBottom: 10, overflow: "hidden",
  },
  noteSectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  noteLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteIcon:     { fontSize: 15 },
  noteDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#059669", marginLeft: 2,
  },
  noteChevron:  { fontSize: 12, color: "#a8a29e" },
  notePreview: {
    fontSize: 13, color: "#78716c", lineHeight: 20,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  noteEditor: { paddingHorizontal: 14, paddingBottom: 14 },
  noteInput: {
    backgroundColor: "#f7f1e4",
    borderRadius: 10, padding: 12,
    fontSize: 14, color: "#292524", lineHeight: 22,
    minHeight: 80, textAlignVertical: "top",
    borderWidth: 1, borderColor: "#e7e5e4",
  },
  noteBtnRow: {
    flexDirection: "row", justifyContent: "flex-end",
    gap: 8, marginTop: 8,
  },
  noteDeleteBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: "#fca5a5",
    backgroundColor: "#fff1f2",
  },
  noteDeleteText: { color: "#dc2626", fontSize: 13, fontWeight: "600" },
  noteSaveBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 8, backgroundColor: "#059669",
  },
  noteSaveBtnDisabled: { backgroundColor: "#d6d3d1" },
  noteSaveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Kelimeler ──
  wordsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wordChip: {
    backgroundColor: "#f5f0e8", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", minWidth: 60,
  },
  wordArabic:  { fontSize: 18, color: "#1c1917", fontFamily: "serif", textAlign: "center" },
  wordMeaning: { marginTop: 3, fontSize: 11, color: "#44403c", textAlign: "center" },
  wordPos:     { marginTop: 2, fontSize: 10, color: "#a8a29e", textAlign: "center", fontStyle: "italic" },

  // ── Navigasyon ──
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 8,
  },
  navBtn: {
    paddingHorizontal: 20, paddingVertical: 12,
    minHeight: 44, justifyContent: "center",
    backgroundColor: "#059669", borderRadius: 8,
  },
  navBtnDisabled:     { backgroundColor: "#d6d3d1" },
  navBtnText:         { fontSize: 14, fontWeight: "600", color: "#fff" },
  navBtnTextDisabled: { color: "#a8a29e" },
  navCenter:          { fontSize: 13, color: "#78716c" },
});
