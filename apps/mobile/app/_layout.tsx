import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)"                         options={{ headerShown: false }} />
        <Stack.Screen name="surah/[id]"                     options={{ headerShown: false }} />
        <Stack.Screen name="ayah/[surahId]/[ayahNumber]"    options={{ headerShown: false }} />
        <Stack.Screen name="ogren/index"                           options={{ title: "Elif-Ba Öğren", headerBackTitle: "Geri" }} />
        <Stack.Screen name="ogren/[dersId]"                       options={{ headerBackTitle: "Dersler" }} />
        <Stack.Screen name="ibadet-rehberi"                  options={{ title: "İbadet Rehberi", headerBackTitle: "Geri" }} />
        <Stack.Screen name="namaz"                          options={{ title: "Namaz & İbadet", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak"                 options={{ title: "Manevi Sığınak", headerBackTitle: "Geri" }} />
        <Stack.Screen name="manevi-siginak/ismi-azam"       options={{ title: "İsmi Azam & Sekine", headerBackTitle: "Geri" }} />
        <Stack.Screen name="search"                         options={{ title: "Arama", headerBackTitle: "Geri" }} />
        <Stack.Screen name="mushaf/index"                         options={{ title: "Mushaf", headerBackTitle: "Geri", headerShown: false }} />
        <Stack.Screen name="mushaf/[surahId]/[ayahNumber]"        options={{ headerBackTitle: "Mushaf", headerShown: false }} />
        <Stack.Screen name="root/index"                           options={{ title: "Kelime Kökleri", headerBackTitle: "Geri" }} />
        <Stack.Screen name="root/[root]/index"                    options={{ headerBackTitle: "Kökler" }} />
        <Stack.Screen name="kible"                                options={{ title: "Kıble Yönü", headerBackTitle: "Geri" }} />
        <Stack.Screen name="hatim"                                options={{ title: "Hatim Takibi", headerBackTitle: "Geri" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
