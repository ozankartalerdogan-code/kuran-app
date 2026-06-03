import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import React, { Component, type ErrorInfo, type ReactNode, useState, useEffect, useCallback } from "react";
import ErrorFallback from "../src/components/ErrorFallback";
import { AppSplash } from "../src/components/AppSplash";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} resetError={this.handleReset} />;
    }

    return this.props.children;
  }
}

function AppContent() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
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
        <Stack.Screen name="hatim"                                options={{ title: "Hatim & Mushaf", headerBackTitle: "Geri" }} />
        <Stack.Screen name="kesfet"                               options={{ title: "Keşfet", headerBackTitle: "Geri" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [videoFinished, setVideoFinished] = useState(false);
  const [fontsLoaded] = Font.useFonts({
    "Amiri":      require("../assets/fonts/Amiri-Regular.ttf"),
    "Amiri-Bold": require("../assets/fonts/Amiri-Bold.ttf"),
  });

  const ready = videoFinished && !!fontsLoaded;

  const handleSplashFinish = useCallback(() => {
    setVideoFinished(true);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    // Maksimum 5 saniye bekle (video yüklenemezse)
    const timer = setTimeout(() => {
      setVideoFinished(true);
    }, 5000);

    // Bildirime tıklanınca ilgili ekrana git (uygulama hazır olduktan sonra)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      setTimeout(() => {
        if (data?.surahId && data?.ayahNumber) {
          router.push(`/ayah/${data.surahId}/${data.ayahNumber}` as any);
        } else if (data?.route) {
          router.push(data.route as any);
        }
      }, 500); // Stack mount'u için kısa bekleme
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  if (!ready) return <AppSplash onFinish={handleSplashFinish} />;

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
