import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useColorScheme } from "react-native";
import { router } from "expo-router";
import { useState } from "react";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Bir şeyler ters gitti</Text>
      <Text style={[styles.message, isDark && styles.textDark]}>
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
      </Text>

      <TouchableOpacity style={styles.button} onPress={resetError} accessibilityRole="button" accessibilityLabel="Yeniden dene">
        <Text style={styles.buttonText}>Yeniden Dene</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.homeButton]}
        onPress={() => router.replace("/")}
        accessibilityRole="button"
        accessibilityLabel="Ana sayfaya dön"
      >
        <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.detailToggle}
            onPress={() => setShowDetails(!showDetails)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
          >
            <Text style={[styles.detailToggleText, isDark && styles.textDark]}>
              {showDetails ? "Hata Detayını Gizle" : "Hata Detayını Göster"}
            </Text>
          </TouchableOpacity>

          {showDetails && (
            <ScrollView style={styles.detailContainer}>
              <Text style={[styles.detailText, isDark && styles.textDark]}>
                {error?.message || "Bilinmeyen hata"}
              </Text>
              {error?.stack != null && (
                <Text style={[styles.detailText, styles.stackText, isDark && styles.textDark]}>
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
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
    textAlign: "center",
  },
  textDark: {
    color: "#e0e0e0",
  },
  message: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    minWidth: 200,
    alignItems: "center",
  },
  homeButton: {
    backgroundColor: "#1565c0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailToggle: {
    marginTop: 24,
    paddingVertical: 8,
  },
  detailToggleText: {
    fontSize: 14,
    color: "#777",
    textDecorationLine: "underline",
  },
  detailContainer: {
    marginTop: 12,
    maxHeight: 200,
    width: "100%",
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 12,
  },
  detailText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "monospace",
  },
  stackText: {
    marginTop: 8,
    opacity: 0.7,
  },
});