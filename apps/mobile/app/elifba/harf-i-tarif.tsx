import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HarfITarifContent } from "../../src/components/HarfITarifContent";
import { useStrings } from "../../src/i18n";
import elifbaStrings from "../../src/i18n/strings/elifba";

export default function HarfITarifScreen() {
  const insets = useSafeAreaInsets();
  const t = useStrings(elifbaStrings);
  return (
    <>
      <Stack.Screen options={{ title: t.tabTarif }} />
      <HarfITarifContent paddingTop={16} paddingBottom={insets.bottom + 40} />
    </>
  );
}
