import React, { useRef, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Dimensions,
} from "react-native";
import { useColors } from "../hooks/useColors";
import { captureAndShareView } from "../lib/shareImage";
import { mushafMetniHazirla } from "../lib/mushafText";

// Görsel ayet paylaşımı — "Kuran Yolu" markalı kart önizlemesi + paylaşım seçimi.
// Kart tasarımı temadan BAĞIMSIZ sabittir (krem zemin): paylaşılan görsel her
// kullanıcıda aynı marka kimliğiyle görünsün diye.

const CARD_W = Math.min(Dimensions.get("window").width - 48, 360);

// Uzun ayetlerde yazı küçülür; Kur'an metni asla kırpılmaz, kart uzar.
function arabicFontSize(len: number) {
  return len > 500 ? 18 : len > 300 ? 21 : len > 150 ? 25 : len > 60 ? 29 : 33;
}
function mealFontSize(len: number) {
  return len > 600 ? 12 : len > 350 ? 13.5 : len > 180 ? 15 : 16.5;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  surahName: string;
  ayahNumber: number;
  arabic: string | null;
  meal: string | null;
  onShareText: () => void; // metin paylaşımı (mevcut davranış) — fallback ve seçenek
}

export function AyahShareModal({ visible, onClose, surahName, ayahNumber, arabic, meal, onShareText }: Props) {
  const c = useColors();
  // KARTTA basılan metin font uyumluluğundan geçmeli: production fontu U+06DF,
  // U+06E3 ve U+06EB yuvalarında gerçek glif taşımaz, yerlerine noktalı daire
  // (sahipsiz işaret) çizer. Mushaf sayfası ve ayet detayı bunu zaten uyguluyor;
  // paylaşım kartı atlanmıştı ve paylaşılan görselde o daireler görünüyordu.
  // Eşleme idempotent — hazırlanmış metin ikinci kez geçse de değişmez.
  // Yalnız GÖRÜNTÜ için: onShareText canonical Unicode'u paylaşmaya devam eder,
  // çünkü alıcının fontu bizimki değildir ve metinde canonical doğru olandır.
  const kartArapca = arabic ? mushafMetniHazirla(arabic) : null;
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShareImage = async () => {
    if (sharing) return;
    setSharing(true);
    const ok = await captureAndShareView(cardRef.current, `${surahName} ${ayahNumber}. Ayet`);
    setSharing(false);
    if (ok) onClose();
    // Başarısızsa (iptal dahil) modal açık kalır; kullanıcı tekrar deneyebilir
    // veya metin paylaşımını seçebilir.
  };

  const handleShareText = () => {
    onClose();
    onShareText();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.backdrop}>
        <ScrollView contentContainerStyle={m.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Yakalanan kart — collapsable={false}: Android'de view-shot için şart */}
          <View ref={cardRef} collapsable={false} style={m.card}>
            <Text style={m.cardHeader}>{surahName.toLocaleUpperCase("tr-TR")} · {ayahNumber}. AYET</Text>
            {kartArapca ? (
              <Text style={[m.cardArabic, { fontSize: arabicFontSize(kartArapca.length), lineHeight: arabicFontSize(kartArapca.length) * 1.8 }]}>
                {kartArapca}
              </Text>
            ) : null}
            <View style={m.cardDivider} />
            {meal ? (
              <Text style={[m.cardMeal, { fontSize: mealFontSize(meal.length), lineHeight: mealFontSize(meal.length) * 1.65 }]}>
                “{meal}”
              </Text>
            ) : null}
            <View style={m.cardBrandRow}>
              <View style={m.cardBrandDot} />
              <Text style={m.cardBrandText}>Kuran Yolu</Text>
            </View>
          </View>

          {/* Aksiyonlar */}
          <View style={[m.actions, { backgroundColor: c.card, borderColor: c.border }]}>
            <TouchableOpacity
              style={[m.primaryBtn, { backgroundColor: c.accent }]}
              onPress={handleShareImage}
              disabled={sharing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Görsel olarak paylaş"
              accessibilityState={{ disabled: sharing }}
            >
              {sharing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.primaryBtnText}>🖼️ Görsel Olarak Paylaş</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.secondaryBtn, { borderColor: c.border }]}
              onPress={handleShareText}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Metin olarak paylaş"
            >
              <Text style={[m.secondaryBtnText, { color: c.textSecondary }]}>Metin Olarak Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={m.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Vazgeç"
            >
              <Text style={[m.cancelText, { color: c.textMuted }]}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },

  // Kart — sabit marka tasarımı (krem zemin, yeşil vurgular)
  card: {
    width: CARD_W, backgroundColor: "#fffdf7", borderRadius: 20,
    paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18,
    borderWidth: 1, borderColor: "#d6d3d1",
  },
  cardHeader: {
    fontSize: 11, fontWeight: "800", color: "#047857",
    letterSpacing: 1.2, textAlign: "center", marginBottom: 14,
  },
  cardArabic: {
    // Canonical Hafs metni — mushafla aynı font (Amiri Hafs işaretlerini taşımıyor).
    fontFamily: "UthmanicHafs", color: "#1c1917",
    textAlign: "right", writingDirection: "rtl", width: "100%",
  },
  cardDivider: {
    alignSelf: "center", width: 44, height: 2, borderRadius: 1,
    backgroundColor: "#a7f3d0", marginVertical: 14,
  },
  cardMeal: {
    color: "#44403c", fontStyle: "italic", textAlign: "center",
  },
  cardBrandRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 18,
  },
  cardBrandDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669" },
  cardBrandText: { fontSize: 12, fontWeight: "800", color: "#059669", letterSpacing: 0.6 },

  // Aksiyon paneli
  actions: {
    width: CARD_W, borderRadius: 16, borderWidth: 1, padding: 12, gap: 8,
  },
  primaryBtn: {
    borderRadius: 10, paddingVertical: 12, alignItems: "center", minHeight: 44, justifyContent: "center",
  },
  primaryBtnText:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 11, alignItems: "center",
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "600" },
  cancelBtn:  { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 13, fontWeight: "600" },
});
