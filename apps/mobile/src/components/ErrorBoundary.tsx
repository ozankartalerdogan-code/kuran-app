import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStrings } from "../i18n";
import misc1Strings from "../i18n/strings/misc1";
import { useColors } from "../hooks/useColors";
import { Button, toneColors } from "./ui";

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

function ErrorBoundaryView({ onReset }: { onReset: () => void }) {
  const c = useColors();
  const t = useStrings(misc1Strings);
  const tone = toneColors(c, "amber");
  return (
    <View style={[styles.container, { backgroundColor: c.card }]}>
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <Ionicons name="warning-outline" size={28} color={tone.fg} accessible={false} importantForAccessibility="no" />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{t.errTitle}</Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>{t.errBoundarySub}</Text>
      <Button variant="primary" label={t.retry} onPress={onReset} accessibilityLabel={t.retryA11y} />
    </View>
  );
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
      return <ErrorBoundaryView onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconWrap:  { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sub:       { fontSize: 14, textAlign: "center", marginBottom: 24 },
});
