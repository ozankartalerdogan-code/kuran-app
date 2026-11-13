import { PlatformPressable } from "expo-router/react-navigation";
import { useTourTarget } from "../../src/tour/AppTourProvider";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRef, type ComponentProps } from "react";
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

function TourTabButton({ targetId, ...props }: ComponentProps<typeof PlatformPressable> & { targetId: string }) {
  const focusRef = useRef<View>(null);
  const target = useTourTarget(targetId, focusRef);
  // PlatformPressable ref'i native görünüme iletmeyebilir; ölçüm için düz View sarmalayıcı.
  return (
    <View {...target} accessible={false} importantForAccessibility="no" style={{ flex: 1 }}>
      <PlatformPressable {...props} ref={node => {
        focusRef.current = node && typeof node === "object" && "measureInWindow" in node ? node : null;
        if (typeof props.ref === "function") props.ref(node);
        else if (props.ref) props.ref.current = node;
      }} />
    </View>
  );
}

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
            tabBarButton: ["kuran", "ogren", "daha-fazla"].includes(tab.name)
              ? (props) => <TourTabButton {...props} targetId={`tab.${tab.name}`} /> : undefined,
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
