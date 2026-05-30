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
  { name: "index",     title: "Ana Sayfa", icon: "home-outline",     iconActive: "home"           },
  { name: "surah",     title: "Sureler",   icon: "book-outline",     iconActive: "book"           },
  { name: "discover",  title: "Arama",     icon: "search-outline",   iconActive: "search"         },
  { name: "favorites", title: "Favoriler", icon: "heart-outline",    iconActive: "heart"          },
  { name: "notes",     title: "Notlarım",  icon: "create-outline",   iconActive: "create"         },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
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
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTitleStyle: {
          fontWeight: "700",
          color:      "#1c1917",
        },
        headerShadowVisible: false,
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
