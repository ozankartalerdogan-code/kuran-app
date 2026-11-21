import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Button } from "./ui";
import { fmt, useStrings } from "../i18n";
import elifbaStrings from "../i18n/strings/elifba";
import { kelimeSesId, playKelimeSes } from "../lib/elifbaAudio";

export function ElifbaWordAudioButton({ word }: { word: string }) {
  const ep = useStrings(elifbaStrings);
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);
  useFocusEffect(useCallback(() => cancel, [cancel]));
  useEffect(() => cancel, [cancel, word]);

  if (!kelimeSesId(word)) return null;

  return (
    <Button
      variant="ghost"
      tone="accent"
      icon={playing ? "volume-high" : "volume-medium-outline"}
      accessibilityLabel={fmt(ep.listenWordA11y, { word })}
      onPress={() => {
        cancelRef.current?.();
        cancelRef.current = playKelimeSes(word, undefined, setPlaying);
      }}
    />
  );
}
