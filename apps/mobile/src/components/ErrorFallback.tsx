import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { useStrings } from "../i18n";
import misc1Strings from "../i18n/strings/misc1";
import { useColors } from "../hooks/useColors";
import { Button } from "./ui";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const t = useStrings(misc1Strings);
  const c = useColors();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>{t.errTitle}</Text>
      <Text style={[styles.message, { color: c.textSecondary }]}>
        {t.errFallbackMsg}
      </Text>

      <Button
        variant="primary"
        label={t.retry}
        onPress={resetError}
        accessibilityLabel={t.retryA11y}
        style={styles.actionBtn}
      />

      <Button
        variant="secondary"
        label={t.home}
        onPress={() => router.replace("/")}
        accessibilityLabel={t.homeA11y}
        style={styles.actionBtn}
      />

      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.detailToggle}
            onPress={() => setShowDetails(!showDetails)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
          >
            <Text style={[styles.detailToggleText, { color: c.textMuted }]}>
              {showDetails ? t.hideDetails : t.showDetails}
            </Text>
          </TouchableOpacity>

          {showDetails && (
            <ScrollView style={[styles.detailContainer, { backgroundColor: c.cardAlt }]}>
              <Text style={[styles.detailText, { color: c.text }]}>
                {error?.message || t.unknownError}
              </Text>
              {error?.stack != null && (
                <Text style={[styles.detailText, styles.stackText, { color: c.text }]}>
                  {error.stack}
                </Text>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  actionBtn: {
    marginBottom: 12,
    minWidth: 200,
  },
  detailToggle: {
    marginTop: 24,
    paddingVertical: 8,
  },
  detailToggleText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  detailContainer: {
    marginTop: 12,
    maxHeight: 200,
    width: "100%",
    borderRadius: 8,
    padding: 12,
  },
  detailText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  stackText: {
    marginTop: 8,
    opacity: 0.7,
  },
});