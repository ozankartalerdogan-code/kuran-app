import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";
import { useStrings } from "../../src/i18n";
import tabStrings from "../../src/i18n/strings/tabs";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: string;
  titleKey: keyof typeof tabStrings.tr;
  icon: IoniconsName;
  iconActive: IoniconsName;
}[] = [
  { name: "index",      titleKey: "home",       icon: "home-outline",   iconActive: "home"   },
  { name: "kuran",      titleKey: "quran", icon: "book-outline",   iconActive: "book"   },
  { name: "ogren",      titleKey: "learn",      icon: "school-outline", iconActive: "school" },
  { name: "ibadet",     titleKey: "worship",    icon: "moon-outline",   iconActive: "moon"   },
  { name: "daha-fazla", titleKey: "more",       icon: "menu-outline",   iconActive: "menu"   },
];

export default function TabsLayout() {
  const c = useColors();
  const s = useStrings(tabStrings);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor:  c.border,
          borderTopWidth:  1,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: "600",
        },
        // 10pt etiket, sistemin büyük yazı ayarında sekme çubuğundan taşıyor;
        // sekmeler zaten ikonlu — etiket sistem ölçeğinden muaf tutulur.
        tabBarAllowFontScaling: false,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: s[tab.titleKey],
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
