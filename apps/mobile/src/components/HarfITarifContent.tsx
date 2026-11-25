import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../hooks/useColors";
import { useStrings, useLang, fmt } from "../i18n";
import { useLocalizedData } from "../i18n/localizedData";
import { localizedTranslit } from "../lib/translitEn";
import { READING_MAX_WIDTH } from "../lib/layout";
import { storage, STORAGE_KEYS } from "../lib/storage";
import {
  parseElifbaQuizScores,
  type ElifbaQuizScore,
} from "../lib/elifbaProgress";
import {
  HARF_I_TARIF_SCORE_ID,
  mergeHarfITarifScore,
  summarizeHarfITarif,
} from "../lib/harfITarifScore";
import harfStrings from "../i18n/strings/harfITarif";
import {
  harfITarifDersi,
  type HarfTarifBolum,
  type HarfTarifSoru,
} from "../data/harfITarifDersi";
import { Button, Callout, radius, space, toneColors } from "./ui";

type C = ReturnType<typeof useColors>;

function parseOptions(soru: string): [string, string] | null {
  const parts = soru.includes(",") ? soru.split(",") : soru.split(/\s+or\s+/i);
  if (parts.length !== 2) return null;
  const clean = (p: string) => p.replace(/\s*m[ıiuü]\s*\??\s*$/i, "").replace(/\s*\?\s*$/, "").trim();
  const a = clean(parts[0]), b = clean(parts[1]);
  return a && b ? [a, b] : null;
}

function Card({ c, baslik, alt, children }: { c: C; baslik: string; alt?: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[s.h2, { color: c.text }]}>{baslik}</Text>
      {alt ? <Text style={[s.alt, { color: c.textMuted }]}>{alt}</Text> : null}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

function Tag({ tip }: { tip: "semsiye" | "kameriye" }) {
  const t = useStrings(harfStrings);
  const c = useColors();
  const tone = toneColors(c, tip === "semsiye" ? "amber" : "violet");
  return (
    <View style={[s.tag, { backgroundColor: tone.bg }]}>
      <Text style={[s.tagText, { color: tone.fg }]}>{tip === "semsiye" ? t.sun : t.moon}</Text>
    </View>
  );
}

function QuizItem({ q, idx, c, onAnswer }: { q: HarfTarifSoru; idx: number; c: C; onAnswer: (ok: boolean) => void }) {
  const t = useStrings(harfStrings);
  const [picked, setPicked] = useState<string | null>(null);
  const opts = parseOptions(q.soru) ?? [q.dogru_cevap, "—"];
  return (
    <View style={[s.qBox, { borderColor: c.border }]}>
      <Text style={[s.qText, { color: c.text }]}>{idx + 1}. {q.harf}</Text>
      <View style={{ flexDirection: "row", gap: space.xs, marginTop: space.xs }}>
        {opts.map((opt) => {
          const isCorrect = opt === q.dogru_cevap;
          const isPicked  = picked === opt;
          let bg = c.card, brd = c.border, col = c.text;
          if (picked) {
            if (isCorrect)       { bg = c.greenBg; brd = c.greenBorder; col = c.greenText; }
            else if (isPicked)   { bg = c.errorBg; brd = c.errorBorder; col = c.errorText; }
            else                 { col = c.textMuted; }
          }
          return (
            <TouchableOpacity
              key={opt}
              disabled={picked !== null}
              activeOpacity={0.8}
              onPress={() => { setPicked(opt); onAnswer(isCorrect); }}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.answerA11y, { opt })}
              accessibilityState={{ disabled: picked !== null, selected: isPicked }}
              style={[s.opt, { backgroundColor: bg, borderColor: brd }]}
            >
              <Text style={[s.optText, { color: col }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {picked ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.xs, flexWrap: "wrap" }}>
          <Tag tip={q.tip} />
          <Text style={[s.aciklama, { color: c.textMuted, flex: 1 }]}>{q.aciklama}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Quiz({ b, c }: { b: HarfTarifBolum; c: C }) {
  const t = useStrings(harfStrings);
  const sorular = b.sorular ?? [];
  const [started, setStarted] = useState(false);
  const [ans, setAns]         = useState<Record<string, boolean>>({});
  const [last, setLast]       = useState<ElifbaQuizScore | null>(null);
  const [scoreError, setScoreError] = useState<null | "save" | "load">(null);
  const savedRef = useRef(false);
  const snapshotRef = useRef<ElifbaQuizScore | null>(null);
  const done    = Object.keys(ans).length;
  const correct = Object.values(ans).filter(Boolean).length;

  const persist = useCallback(async (snapshot: ElifbaQuizScore) => {
    setScoreError(null);
    try {
      const raw = await storage.getJSON<unknown>(STORAGE_KEYS.quizScores);
      const merged = mergeHarfITarifScore(parseElifbaQuizScores(raw), snapshot);
      await storage.setJSON(STORAGE_KEYS.quizScores, merged);
      setLast(merged[HARF_I_TARIF_SCORE_ID]);
    } catch {
      setScoreError("save");
    }
  }, []);

  const loadLast = useCallback(() => {
    storage.getJSON<unknown>(STORAGE_KEYS.quizScores)
      .then((raw) => {
        setLast(parseElifbaQuizScores(raw)[HARF_I_TARIF_SCORE_ID] ?? null);
        setScoreError(null);
      })
      .catch(() => setScoreError("load"));
  }, []);

  useEffect(() => { loadLast(); }, [loadLast]);

  useEffect(() => {
    if (!started || done !== sorular.length || savedRef.current) return;
    savedRef.current = true;
    const snapshot = summarizeHarfITarif(sorular.map((q) => q.id), ans);
    if (!snapshot) {
      savedRef.current = false;
      return;
    }
    snapshotRef.current = snapshot;
    void persist(snapshot);
  }, [started, done, sorular, ans, persist]);

  const retryScore = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (snapshot) void persist(snapshot);
    else loadLast();
  }, [persist, loadLast]);

  const restart = useCallback(() => {
    savedRef.current = false;
    snapshotRef.current = null;
    setScoreError(null);
    setStarted(false);
    setAns({});
  }, []);

  const errorNotice = scoreError ? (
    <View style={[s.scoreError, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[s.scoreErrorText, { color: c.text }]} accessibilityLiveRegion="polite">
        {scoreError === "load" ? t.loadError : t.saveError}
      </Text>
      <Button
        variant="secondary"
        label={t.retrySave}
        onPress={retryScore}
        accessibilityLabel={t.retrySaveA11y}
      />
    </View>
  ) : null;

  if (!started) {
    return (
      <View style={[s.quizStart, { backgroundColor: c.bg }]}>
        <Text style={[s.quizStartInfo, { color: c.textMuted }]}>
          {fmt(t.quizInfo, { n: sorular.length })}
        </Text>
        {last ? (
          <Text style={[s.lastScore, { color: c.textMuted }]} accessibilityLiveRegion="polite">
            {fmt(t.lastScore, { s: last.score, t: last.total })}
          </Text>
        ) : null}
        {errorNotice}
        <Button
          variant="primary"
          label={t.start}
          onPress={() => setStarted(true)}
          accessibilityLabel={t.startA11y}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[s.quizBar, { backgroundColor: c.bg }]}>
        <Text style={[s.quizBarText, { color: c.text }]}>{fmt(t.answered, { a: done, b: sorular.length })}</Text>
        <Text style={[s.quizBarText, { color: c.greenText, fontWeight: "700" }]}>{fmt(t.correct, { n: correct })}</Text>
      </View>
      {errorNotice}
      <View style={{ gap: 10, marginTop: 10 }}>
        {sorular.map((q, i) => (
          <QuizItem key={q.id} q={q} idx={i} c={c} onAnswer={(ok) => setAns((p) => ({ ...p, [q.id]: ok }))} />
        ))}
      </View>
      {done === sorular.length ? (
        <Callout tone="success" style={{ marginTop: 14 }}>
          <View style={{ gap: space.xs }}>
            <Text style={[s.quizDoneText, { color: c.greenText }]}>
              {fmt(t.finished, { c: correct, n: sorular.length })}{correct === sorular.length ? t.perfect : t.again}
            </Text>
            {last ? (
              <Text style={[s.lastScore, { color: c.textMuted }]} accessibilityLiveRegion="polite">
                {fmt(t.lastScore, { s: last.score, t: last.total })}
              </Text>
            ) : null}
            <Button
              variant="primary"
              label={t.restart}
              onPress={restart}
              accessibilityLabel={t.restartA11y}
              style={{ marginTop: space.xxs }}
            />
          </View>
        </Callout>
      ) : null}
    </>
  );
}

function Bolum({ b, c }: { b: HarfTarifBolum; c: C }) {
  const t = useStrings(harfStrings);
  const lang = useLang();
  switch (b.tip) {
    case "bilgi":
      return (
        <Card c={c} baslik={b.baslik}>
          {b.icerik ? <Text style={[s.body, { color: c.textSecondary ?? c.textMuted }]}>{b.icerik}</Text> : null}
          {b.ornek ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={[s.pill, { backgroundColor: c.greenBg, borderColor: c.greenBorder }]}><Text style={[s.pillText, { color: c.greenText }]}>{b.ornek.dogru}</Text></View>
              <View style={[s.pill, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}><Text style={[s.pillText, { color: c.errorText }]}>{b.ornek.yanlis}</Text></View>
              <Text style={[s.aciklama, { color: c.textMuted }]}>{b.ornek.aciklama}</Text>
            </View>
          ) : null}
        </Card>
      );
    case "kural":
      return (
        <Card c={c} baslik={b.baslik}>
          {b.icerik ? <Text style={[s.body, { color: c.textSecondary ?? c.textMuted }]}>{b.icerik}</Text> : null}
          {b.hafiza_ipucu ? (
            <Callout tone="warning" icon="bulb-outline" title={t.memoryTip} style={{ marginTop: 10 }}>
              {b.hafiza_ipucu}
            </Callout>
          ) : null}
          {b.gorsel_aciklama ? <Text style={[s.mono, { backgroundColor: c.bg, color: c.text }]}>{b.gorsel_aciklama}</Text> : null}
        </Card>
      );
    case "liste": {
      const isS = b.id === "semsiye_harfler";
      const tone = toneColors(c, isS ? "amber" : "violet");
      return (
        <Card c={c} baslik={b.baslik} alt={b.alt_baslik}>
          <View style={s.grid}>
            {(b.harfler ?? []).map((h, i) => (
              <View key={i} style={[s.harfBox, c.isDark
                ? { backgroundColor: c.cardAlt, borderColor: tone.bg } // koyuda dolu ton kartı fazla baskın; ton kenarda
                : { backgroundColor: tone.bg, borderColor: c.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[s.harfAd, { color: c.text }]}>{h.ad}</Text>
                  <Text style={[s.harfArapca, { color: c.text }]}>{h.arapca}</Text>
                </View>
                <Text style={[s.okunus, { color: c.textMuted }]}>{localizedTranslit(h.okunusu, lang)}</Text>
                {h.ornek_esma ? <Text style={[s.esma, { color: c.greenText }]}>{h.ornek_esma}</Text> : null}
              </View>
            ))}
          </View>
        </Card>
      );
    }
    case "ornekler":
      return (
        <Card c={c} baslik={b.baslik} alt={b.alt_baslik}>
          <View style={{ gap: 10 }}>
            {(b.ornekler ?? []).map((o, i) => (
              <View key={i} style={[s.ornekBox, { borderColor: c.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.text }}>
                    <Text style={{ fontWeight: "700" }}>{o.isim}</Text>
                    {"  "}
                    <Text style={[s.aciklama, { color: c.textMuted }]}>{o.anlam}</Text>
                  </Text>
                  {/* ornekBox zemini c.card — sabit koyu harf gece modunda kaybolur */}
                  <Text style={[s.harfArapca, { color: c.text }]}>{o.arapca}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <Tag tip={o.tip} />
                  <Text style={[s.aciklama, { color: c.textSecondary ?? c.textMuted, flex: 1 }]}>{o.aciklama}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      );
    case "baglam":
      return (
        <Card c={c} baslik={b.baslik}>
          {b.icerik ? <Text style={[s.body, { color: c.textSecondary ?? c.textMuted }]}>{b.icerik}</Text> : null}
          {(b.not || b.gorsel_ipucu) ? (
            <Callout tone="info" style={{ marginTop: 10 }}>
              {b.not || b.gorsel_ipucu}
            </Callout>
          ) : null}
        </Card>
      );
    case "quiz":
      return <Card c={c} baslik={b.baslik}><Quiz b={b} c={c} /></Card>;
    case "ozet":
      return (
        <Card c={c} baslik={b.baslik}>
          <View style={{ gap: 6 }}>
            {(b.maddeler ?? []).map((m, i) => (
              <View key={i} style={{ flexDirection: "row", gap: space.xs }}>
                <Text style={{ color: c.accent, marginTop: 1 }}>•</Text>
                <Text style={[s.body, { color: c.textSecondary ?? c.textMuted, flex: 1 }]}>{m}</Text>
              </View>
            ))}
          </View>
        </Card>
      );
    default:
      return null;
  }
}

export function HarfITarifContent({ paddingTop = 16, paddingBottom = 40 }: { paddingTop?: number; paddingBottom?: number }) {
  const c = useColors();
  const d = useLocalizedData(harfITarifDersi);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.gutter, paddingTop, paddingBottom, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
        <View style={{ flexDirection: "row", gap: 2 }}>
          <Ionicons name="sunny-outline" size={20} color={c.text} />
          <Ionicons name="moon-outline" size={20} color={c.text} />
        </View>
        <Text style={[s.title, { color: c.text, flexShrink: 1 }]}>{d.baslik}</Text>
      </View>
      <Text style={[s.sub, { color: c.textMuted }]}>{d.aciklama}</Text>
      <View style={{ flexDirection: "row", gap: space.xs, marginTop: space.xs, marginBottom: 14, flexWrap: "wrap" }}>
        <View style={[s.meta, s.metaRow, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
          <Ionicons name="time-outline" size={13} color={c.textMuted} />
          <Text style={[s.metaText, { color: c.textMuted }]}>{d.sure}</Text>
        </View>
        <View style={[s.meta, s.metaRow, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
          <Ionicons name="list-outline" size={13} color={c.textMuted} />
          <Text style={[s.metaText, { color: c.textMuted }]}>{d.on_kosul}</Text>
        </View>
      </View>
      {d.bolumler.map((b) => <Bolum key={b.id} b={b} c={c} />)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title:       { fontSize: 20, fontWeight: "700" },
  sub:         { fontSize: 13, marginTop: 4, lineHeight: 19 },
  meta:        { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  metaRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:    { fontSize: 11, fontWeight: "600" },
  card:        { borderRadius: radius.lg, borderWidth: 1, padding: space.md, marginBottom: space.sm },
  h2:          { fontSize: 16, fontWeight: "700" },
  alt:         { fontSize: 12, marginTop: 2 },
  body:        { fontSize: 13.5, lineHeight: 20 },
  mono:        { marginTop: space.xs, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: space.xs, fontSize: 12, fontFamily: "monospace" },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  harfBox:     { width: "47.5%", borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: space.xs },
  harfAd:      { fontSize: 14, fontWeight: "700" },
  harfArapca:  { fontSize: 20, fontFamily: "Amiri", writingDirection: "rtl" },
  okunus:      { fontSize: 12, marginTop: 2 },
  esma:        { fontSize: 11, marginTop: 4, lineHeight: 15 },
  ornekBox:    { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 10 },
  pill:        { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: space.xs },
  pillText:    { fontSize: 14, fontWeight: "700" },
  aciklama:    { fontSize: 12, lineHeight: 17 },
  tag:         { borderRadius: radius.pill, paddingHorizontal: space.xs, paddingVertical: 3 },
  tagText:     { fontSize: 10, fontWeight: "700" },
  quizStart:       { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: space.xxs, alignItems: "center", gap: space.sm },
  quizStartInfo:   { fontSize: 13 },
  lastScore:       { fontSize: 13, fontWeight: "600" },
  scoreError:      { alignSelf: "stretch", borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 10, gap: space.xs, alignItems: "center" },
  scoreErrorText:  { fontSize: 13, textAlign: "center" },
  quizBar:     { flexDirection: "row", justifyContent: "space-between", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  quizBarText: { fontSize: 13, fontWeight: "600" },
  qBox:        { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: space.sm },
  qText:       { fontSize: 14, fontWeight: "600" },
  opt:         { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: "center" },
  optText:     { fontSize: 14, fontWeight: "600" },
  quizDoneText:{ fontSize: 14, fontWeight: "700" },
});
