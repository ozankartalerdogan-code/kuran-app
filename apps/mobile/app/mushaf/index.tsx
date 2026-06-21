import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MushafReader } from "../../src/components/MushafReader";

export default function MushafScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: "Mushaf" }} />
      <MushafReader loadBookmark={true} />
    </View>
  );
}
