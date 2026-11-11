import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "../hooks/useColors";
import { useStrings, useLang, fmt } from "../i18n";
import { useLocalizedData } from "../i18n/localizedData";
import { localizedTranslit } from "../lib/translitEn";
import harfStrings from "../i18n/strings/harfITarif";
import {
  harfITarifDersi,
  type HarfTarifBolum,
  type HarfTarifSoru,
} from "../data/harfITarifDersi";

type C = ReturnType<typeof useColors>;

const TIP_COLOR = { semsiye: "#b45309", kameriye: "#4338ca" } as const;
const TIP_BG    = { semsiye: "#fef3c7", kameriye: "#e0e7ff" } as const;

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
  return (
    <View style={[s.tag, { backgroundColor: TIP_BG[tip] }]}>
      <Text style={[s.tagText, { color: TIP_COLOR[tip] }]}>{tip === "semsiye" ? t.sun : t.moon}</Text>
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
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {opts.map((opt) => {
          const isCorrect = opt === q.dogru_cevap;
          const isPicked  = picked === opt;
          let bg = c.card, brd = c.border, col = c.text;
          if (picked) {
            if (isCorrect)       { bg = "#dcfce7"; brd = "#86efac"; col = "#15803d"; }
            else if (isPicked)   { bg = "#fee2e2"; brd = "#fca5a5"; col = "#b91c1c"; }
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
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
  const done    = Object.keys(ans).length;
  const correct = Object.values(ans).filter(Boolean).length;

  if (!started) {
    return (
      <View style={[s.quizStart, { backgroundColor: c.bg }]}>
        <Text style={[s.quizStartInfo, { color: c.textMuted }]}>
          {fmt(t.quizInfo, { n: sorular.length })}
        </Text>
        <TouchableOpacity
          style={s.quizStartBtn}
          onPress={() => setStarted(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t.startA11y}
        >
          <Text style={s.quizStartBtnText}>{t.start}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={[s.quizBar, { backgroundColor: c.bg }]}>
        <Text style={[s.quizBarText, { color: c.text }]}>{fmt(t.answered, { a: done, b: sorular.length })}</Text>
        <Text style={[s.quizBarText, { color: "#059669", fontWeight: "700" }]}>{fmt(t.correct, { n: correct })}</Text>
      </View>
      <View style={{ gap: 10, marginTop: 10 }}>
        {sorular.map((q, i) => (
          <QuizItem key={q.id} q={q} idx={i} c={c} onAnswer={(ok) => setAns((p) => ({ ...p, [q.id]: ok }))} />
        ))}
      </View>
      {done === sorular.length ? (
        <View style={s.quizDone}>
          <Text style={s.quizDoneText}>
            {fmt(t.finished, { c: correct, n: sorular.length })}{correct === sorular.length ? t.perfect : t.again}
          </Text>
          <TouchableOpacity
            style={[s.quizStartBtn, { marginTop: 10 }]}
            onPress={() => { setStarted(false); setAns({}); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t.restartA11y}
          >
            <Text style={s.quizStartBtnText}>{t.restart}</Text>
          </TouchableOpacity>
        </View>
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
              <View style={[s.pill, { backgroundColor: "#dcfce7" }]}><Text style={[s.pillText, { color: "#15803d" }]}>{b.ornek.dogru}</Text></View>
              <View style={[s.pill, { backgroundColor: "#fee2e2" }]}><Text style={[s.pillText, { color: "#b91c1c" }]}>{b.ornek.yanlis}</Text></View>
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
            <View style={s.ipucu}>
              <Text style={s.ipucuLabel}>{t.memoryTip}</Text>
              <Text style={[s.body, { color: "#78350f" }]}>{b.hafiza_ipucu}</Text>
            </View>
          ) : null}
          {b.gorsel_aciklama ? <Text style={[s.mono, { backgroundColor: c.bg, color: c.text }]}>{b.gorsel_aciklama}</Text> : null}
        </Card>
      );
    case "liste": {
      const isS = b.id === "semsiye_harfler";
      return (
        <Card c={c} baslik={b.baslik} alt={b.alt_baslik}>
          <View style={s.grid}>
            {(b.harfler ?? []).map((h, i) => (
              <View key={i} style={[s.harfBox, { backgroundColor: isS ? "#fffbeb" : "#eef2ff", borderColor: isS ? "#fde68a" : "#c7d2fe" }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[s.harfAd, { color: c.text }]}>{h.ad}</Text>
                  {/* harfBox açık zeminli (fffbeb/eef2ff) — koyu harf rengi bilinçli, temadan bağımsız */}
                  <Text style={s.harfArapca}>{h.arapca}</Text>
                </View>
                <Text style={[s.okunus, { color: c.textMuted }]}>{localizedTranslit(h.okunusu, lang)}</Text>
                {h.ornek_esma ? <Text style={s.esma}>{h.ornek_esma}</Text> : null}
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
            <View style={s.notBox}>
              <Text style={[s.aciklama, { color: "#3730a3" }]}>{b.not || b.gorsel_ipucu}</Text>
            </View>
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
              <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ color: "#059669", marginTop: 1 }}>•</Text>
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
      contentContainerStyle={{ padding: 16, paddingTop, paddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.title, { color: c.text }]}>☀️🌙 {d.baslik}</Text>
      <Text style={[s.sub, { color: c.textMuted }]}>{d.aciklama}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <View style={[s.meta, { backgroundColor: c.card }]}><Text style={[s.metaText, { color: c.textMuted }]}>⏱️ {d.sure}</Text></View>
        <View style={[s.meta, { backgroundColor: c.card }]}><Text style={[s.metaText, { color: c.textMuted }]}>📋 {d.on_kosul}</Text></View>
      </View>
      {d.bolumler.map((b) => <Bolum key={b.id} b={b} c={c} />)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title:       { fontSize: 20, fontWeight: "700" },
  sub:         { fontSize: 13, marginTop: 4, lineHeight: 19 },
  meta:        { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  metaText:    { fontSize: 11, fontWeight: "600" },
  card:        { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  h2:          { fontSize: 16, fontWeight: "700" },
  alt:         { fontSize: 12, marginTop: 2 },
  body:        { fontSize: 13.5, lineHeight: 20 },
  ipucu:       { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#fcd34d", backgroundColor: "#fffbeb", padding: 12 },
  ipucuLabel:  { fontSize: 10, fontWeight: "700", letterSpacing: 1, color: "#b45309", marginBottom: 4 },
  mono:        { marginTop: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontFamily: "monospace" },
  grid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  harfBox:     { width: "47.5%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  harfAd:      { fontSize: 14, fontWeight: "700" },
  harfArapca:  { fontSize: 20, fontFamily: "Amiri", writingDirection: "rtl", color: "#1c1917" },
  okunus:      { fontSize: 12, marginTop: 2 },
  esma:        { fontSize: 11, color: "#047857", marginTop: 4, lineHeight: 15 },
  ornekBox:    { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pill:        { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  pillText:    { fontSize: 14, fontWeight: "700" },
  aciklama:    { fontSize: 12, lineHeight: 17 },
  notBox:      { marginTop: 10, borderRadius: 10, backgroundColor: "#e0e7ff", paddingHorizontal: 12, paddingVertical: 8 },
  tag:         { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:     { fontSize: 10, fontWeight: "700" },
  quizStart:       { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 4, alignItems: "center", gap: 12 },
  quizStartInfo:   { fontSize: 13 },
  quizStartBtn:    { backgroundColor: "#4f46e5", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  quizStartBtnText:{ color: "#fff", fontSize: 14, fontWeight: "700" },
  quizBar:     { flexDirection: "row", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  quizBarText: { fontSize: 13, fontWeight: "600" },
  qBox:        { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  qText:       { fontSize: 14, fontWeight: "600" },
  opt:         { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  optText:     { fontSize: 14, fontWeight: "600" },
  quizDone:    { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: "#86efac", backgroundColor: "#dcfce7", paddingHorizontal: 14, paddingVertical: 12 },
  quizDoneText:{ textAlign: "center", fontSize: 14, fontWeight: "700", color: "#15803d" },
});
