import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "../../hooks/useColors";
import { useStrings } from "../../i18n";
import strings from "../../i18n/strings/onboarding";
import tourStrings from "../../i18n/strings/tour";
import { useAppTour } from "../../tour/AppTourProvider";
import { loadStartPreference, saveStartPreference, START_ROUTES, type StartPreference } from "../../lib/startPreference";
import { Entrance, Icon, PolishButton, preferenceIcons } from "./Polish";
import { StartPreferenceOptions } from "./StartPreferenceOptions";
export function HomeWelcomeCards() {
  const c = useColors(), t = useStrings(strings), ts = useStrings(tourStrings);
  const { offerVisible, onboarded, restartTour, dismissOffer } = useAppTour();
  const [preference, setPreference] = useState<StartPreference | null>(null);
  const [editing, setEditing] = useState(false);
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    loadStartPreference().then(v => { if (!cancelled) setPreference(v); }).catch(() => {});
    return () => { cancelled = true; };
  }, [onboarded]));
  const save = (v: StartPreference | null) => {
    setPreference(v); setEditing(false); void saveStartPreference(v).catch(() => {});
  };
  const card = { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12 };
  return <>
    {onboarded && preference && <Entrance style={card}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentLight, alignItems: "center", justifyContent: "center" }}><Icon name={preferenceIcons[preference]} color={c.actionBg} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20 }}>{t.preferenceTitle}</Text>
          {/* Başlık satırı: "Değiştir" metin düğmesi sağda, ana CTA altta */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: c.text, fontSize: 18, lineHeight: 26, fontWeight: "700" }}>{t[preference]}</Text>
            <PolishButton textOnly label={t.change} onPress={() => setEditing(v => !v)} style={{ paddingHorizontal: 4 }} />
          </View>
        </View>
        <PolishButton textOnly icon="close" accessibilityLabel={t.dismissStartingPoint} onPress={() => save(null)} style={{ width: 48, height: 48 }} />
      </View>
      <PolishButton primary label={t[`${preference}Action`]} trailingIcon="arrow-forward" onPress={() => router.push(START_ROUTES[preference])} style={{ marginTop: 12 }} />
      {editing && <StartPreferenceOptions value={preference} onChange={save} />}
    </Entrance>}
    {offerVisible && <Entrance style={[card, { backgroundColor: c.cardAlt, borderRadius: 16 }]}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Icon name="compass-outline" size={24} color={c.actionBg} />
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>{ts.offerTitle}</Text>
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>{ts.offerBody}</Text>
        </View>
      </View>
      <PolishButton label={ts.startGuide} onPress={() => { void restartTour(); }} style={{ marginTop: 16 }} />
      <PolishButton textOnly label={ts.dismissOffer} onPress={dismissOffer} />
    </Entrance>}
  </>;
}
