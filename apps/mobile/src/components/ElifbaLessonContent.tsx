import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { useColors } from "../hooks/useColors";
import { useStrings, type Lang } from "../i18n";
import elifbaStrings from "../i18n/strings/elifba";
import { READING_MAX_WIDTH } from "../lib/layout";
import { MAX_LESSON_TERMS, type DersIcerik } from "../lib/elifbaLessonContent";
import { ElifbaWordAudioButton } from "./ElifbaWordAudioButton";
import { space } from "./ui";

type Props = {
  icerik: DersIcerik;
  lang: Lang;
};

export function ElifbaLessonContent({ icerik, lang }: Props) {
  const c = useColors();
  const ep = useStrings(elifbaStrings);
  const [expanded, setExpanded] = useState(false);

  const words = icerik.kelimeler.slice(0, MAX_LESSON_TERMS);
  const aciklama = lang === "tr" ? icerik.aciklama : null;

  if (!aciklama && words.length === 0) return null;

  const canExpand = !!aciklama && !expanded && (
    aciklama.length > 170 || aciklama.split("\n").length > 4
  );

  return (
    <View style={st.box}>
      {aciklama && (
        <View>
          {expanded ? (
            <ScrollView
              style={st.expandedScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={[st.aciklama, { color: c.textSecondary }]}>
                {aciklama}
              </Text>
            </ScrollView>
          ) : (
            <Text
              style={[st.aciklama, { color: c.textSecondary }]}
              numberOfLines={4}
            >
              {aciklama}
            </Text>
          )}
          {canExpand && (
            <TouchableOpacity
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel={ep.moreText}
            >
              <Text style={[st.more, { color: c.accent }]}>{ep.moreText}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {words.length > 0 && (
        <View style={st.wordsBlock}>
          <Text style={[st.title, { color: c.textMuted }]}>{ep.examplesTitle}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.chips}
          >
            {words.map((word) => (
              <View
                key={word}
                style={[st.chip, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              >
                <Text style={[st.chipText, { color: c.text }]}>{word}</Text>
                <ElifbaWordAudioButton word={word} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: {
    width: "100%",
    maxWidth: READING_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
    gap: 6,
  },
  aciklama: { fontSize: 12, lineHeight: 18 },
  expandedScroll: { maxHeight: 144 },
  more: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  wordsBlock: { gap: 4 },
  title: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  chips: { flexDirection: "row", gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: space.xxs, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: "Amiri", fontSize: 18, writingDirection: "rtl" },
});
