import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useColors } from "../../src/hooks/useColors";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const TABS: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
}[] = [
  { name: "index",      title: "Ana Sayfa",  icon: "home-outline",   iconActive: "home"   },
  { name: "kuran",      title: "Kur'an-ı Kerim", icon: "book-outline",   iconActive: "book"   },
  { name: "ogren",      title: "Öğren",      icon: "school-outline", iconActive: "school" },
  { name: "ibadet",     title: "İbadet",     icon: "moon-outline",   iconActive: "moon"   },
  { name: "daha-fazla", title: "Daha Fazla", icon: "menu-outline",   iconActive: "menu"   },
];

export default function TabsLayout() {
  const c = useColors();
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
            title: tab.title,
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
