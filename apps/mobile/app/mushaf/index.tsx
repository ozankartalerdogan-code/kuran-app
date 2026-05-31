import { Stack } from "expo-router";
import { View } from "react-native";
import { MushafReader } from "../../src/components/MushafReader";

export default function MushafScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Mushaf" }} />
      <MushafReader loadBookmark={true} />
    </View>
  );
}
