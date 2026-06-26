import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   "#059669",
        tabBarInactiveTintColor: "#78716c",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor:  "#e7e5e4",
          borderTopWidth:  1,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: "600",
        },
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

      {/* Tab bar'dan gizli — route olarak çalışmaya devam eder */}
      <Tabs.Screen name="surah"     options={{ href: null }} />
      <Tabs.Screen name="discover"  options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="notes"     options={{ href: null }} />
    </Tabs>
  );
}
