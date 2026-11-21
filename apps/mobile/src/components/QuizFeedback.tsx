import { useEffect } from "react";
import { AccessibilityInfo, Platform, Text, type StyleProp, type TextStyle } from "react-native";
import { useColors } from "../hooks/useColors";
import { fmt, useStrings } from "../i18n";
import quizFeedbackStrings from "../i18n/strings/quizFeedback";

export function QuizFeedback({ answered, correct, answer, questionKey, style }: {
  answered: boolean; correct: boolean; answer: string; questionKey: string | number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const t = useStrings(quizFeedbackStrings);
  const message = answered ? (correct ? t.correct : fmt(t.incorrect, { answer })) : "";
  useEffect(() => {
    if (message && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(message);
  }, [message, questionKey]);
  return <Text accessibilityLiveRegion="polite" style={[{ color: c.textSecondary, fontSize: 13 }, message ? style : null]}>{message}</Text>;
}
