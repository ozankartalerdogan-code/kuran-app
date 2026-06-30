import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.sub}>Uygulama beklenmedik bir hatayla karşılaştı.</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset} accessibilityRole="button" accessibilityLabel="Yeniden dene">
            <Text style={styles.btnText}>Yeniden Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" },
  emoji:     { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: "700", color: "#1c1917", marginBottom: 8 },
  sub:       { fontSize: 14, color: "#78716c", textAlign: "center", marginBottom: 24 },
  btn:       { backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText:   { color: "#fff", fontWeight: "600", fontSize: 14 },
});
