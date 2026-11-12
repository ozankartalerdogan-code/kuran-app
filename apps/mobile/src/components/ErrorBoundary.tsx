import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getStrings } from "../i18n";
import misc1Strings from "../i18n/strings/misc1";

// _layout.tsx'teki Sentry.init() zaten çalıştı (singleton) — burada yalnız
// captureException'a erişmek için aynı build-gated require deseni tekrarlanır.
// Bu olmadan bu boundary'nin yakaladığı hatalar Sentry'ye hiç gitmiyordu.
type SentryLike = { captureException: (error: unknown, context?: Record<string, unknown>) => void };
let Sentry: SentryLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
} catch {
  Sentry = { captureException: () => {} };
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const t = getStrings(misc1Strings);
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>{t.errTitle}</Text>
          <Text style={styles.sub}>{t.errBoundarySub}</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset} accessibilityRole="button" accessibilityLabel={t.retryA11y}>
            <Text style={styles.btnText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fffdf6" },
  emoji:     { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 8 },
  sub:       { fontSize: 14, color: "#78716c", textAlign: "center", marginBottom: 24 },
  btn:       { backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText:   { color: "#fff", fontWeight: "600", fontSize: 14 },
});
