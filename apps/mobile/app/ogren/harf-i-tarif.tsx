import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HarfITarifContent } from "../../src/components/HarfITarifContent";

export default function HarfITarifScreen() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stack.Screen options={{ title: "Harf-i Tarif" }} />
      <HarfITarifContent paddingTop={insets.top + 16} paddingBottom={insets.bottom + 40} />
    </>
  );
}
