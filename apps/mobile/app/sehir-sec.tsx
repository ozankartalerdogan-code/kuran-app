import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../src/hooks/useColors";
import { useStrings, fmt } from "../src/i18n";
import sehirSecStrings from "../src/i18n/strings/sehirSec";
import {
  getManualCity,
  isTurkeyCountry,
  searchDiyanetCities,
  setManualCity,
  titleCaseTr,
} from "../src/lib/diyanetPrayer";
import type { ManualCity } from "../src/lib/diyanetPrayer";
import { diyanetDeps } from "../src/lib/diyanetPrayerDeps";
import { markPrayerCityChanged } from "../src/lib/prayerCityEvents";
import { rescheduleNotifications } from "../src/lib/namazNotifications";

type SearchState =
  | { status: "idle" }
  | { status: "short" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; cities: ManualCity[] };

function subtitleOf(city: ManualCity): string {
  const tr = isTurkeyCountry(city.country);
  const name = titleCaseTr(city.name, tr);
  const state = titleCaseTr(city.state, tr);
  const country = titleCaseTr(city.country, tr);
  const parts = state === name ? [country] : [state, country];
  return parts.filter((part) => part.length > 0).join(", ");
}

export default function SehirSecScreen() {
  const c = useColors();
  const t = useStrings(sehirSecStrings);
  const insets = useSafeAreaInsets();

  const [manual, setManual] = useState<ManualCity | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [selecting, setSelecting] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    getManualCity(diyanetDeps())
      .then((city) => {
        if (active) setManual(city);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearch(trimmed.length === 0 ? { status: "idle" } : { status: "short" });
      return;
    }

    let active = true;
    setSearch({ status: "loading" });
    const timer = setTimeout(() => {
      searchDiyanetCities(trimmed, diyanetDeps())
        .then((cities) => {
          if (!active) return;
          setSearch(
            cities === null
              ? { status: "error" }
              : { status: "done", cities },
          );
        })
        .catch(() => {
          if (active) setSearch({ status: "error" });
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const choose = useCallback(
    async (city: ManualCity | null) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setSelecting(true);
      try {
        await setManualCity(city, diyanetDeps());
        setManual(city);
        markPrayerCityChanged();
        void rescheduleNotifications();
        router.back();
      } finally {
        setSelecting(false);
        busyRef.current = false;
      }
    },
    [],
  );

  const isAuto = manual === null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[s.content, { paddingBottom: 24 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[
          s.autoRow,
          {
            backgroundColor: c.card,
            borderColor: isAuto ? c.accent : c.border,
          },
        ]}
        onPress={() => void choose(null)}
        activeOpacity={0.8}
        disabled={selecting}
        accessibilityRole="button"
        accessibilityLabel={t.autoA11y}
        accessibilityState={{ selected: isAuto, disabled: selecting }}
      >
        <View style={s.flex}>
          <Text style={[s.autoTitle, { color: c.text }]}>{t.autoTitle}</Text>
          <Text style={[s.autoSub, { color: c.textMuted }]}>{t.autoSub}</Text>
        </View>
        {isAuto && (
          <View accessibilityLabel={t.selectedA11y}>
            <Ionicons name="checkmark" size={22} color={c.accent} />
          </View>
        )}
      </TouchableOpacity>

      <View style={[s.searchWrap, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={[s.input, { color: c.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t.searchA11y}
        />
      </View>

      {search.status === "loading" && (
        <ActivityIndicator style={s.loading} color={c.accent} />
      )}
      {search.status === "short" && (
        <Text style={[s.message, { color: c.textMuted }]}>{t.minChars}</Text>
      )}
      {search.status === "error" && (
        <Text style={[s.message, { color: c.textSecondary }]}>{t.searchError}</Text>
      )}
      {search.status === "done" && search.cities.length === 0 && (
        <Text style={[s.message, { color: c.textMuted }]}>{t.noResults}</Text>
      )}
      {search.status === "done" &&
        search.cities.map((city) => {
          const isSelected = manual?.id === city.id;
          const name = titleCaseTr(city.name, isTurkeyCountry(city.country));
          const subtitle = subtitleOf(city);
          return (
            <TouchableOpacity
              key={city.id}
              style={[
                s.cityRow,
                {
                  backgroundColor: c.card,
                  borderColor: isSelected ? c.accent : c.border,
                },
              ]}
              onPress={() => void choose(city)}
              activeOpacity={0.8}
              disabled={selecting}
              accessibilityRole="button"
              accessibilityLabel={fmt(t.selectCityA11y, { name })}
              accessibilityState={{ selected: isSelected, disabled: selecting }}
            >
              <View style={s.flex}>
                <Text style={[s.cityName, { color: c.text }]}>{name}</Text>
                {subtitle.length > 0 && (
                  <Text style={[s.citySub, { color: c.textMuted }]}>{subtitle}</Text>
                )}
              </View>
              {isSelected && (
                <View accessibilityLabel={t.selectedA11y}>
                  <Ionicons name="checkmark" size={22} color={c.accent} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

      <Text style={[s.source, { color: c.textMuted }]}>{t.source}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16 },
  flex: { flex: 1 },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  autoTitle: { fontSize: 15, fontWeight: "700" },
  autoSub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 11 },
  loading: { marginTop: 24 },
  message: { fontSize: 14, textAlign: "center", marginTop: 20 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  cityName: { fontSize: 15, fontWeight: "700" },
  citySub: { fontSize: 12, marginTop: 2 },
  source: { fontSize: 11, textAlign: "center", marginTop: 28 },
});
