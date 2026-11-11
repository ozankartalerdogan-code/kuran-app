import { Stack, router, useNavigationContainerRef } from "expo-router";
import type { Href } from "expo-router";
import { maybeAskReview, trackAppOpen } from '../src/hooks/useStoreReview';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import React, { Component, type ErrorInfo, type ReactNode, useState, useEffect, useCallback } from "react";
import ErrorFallback from "../src/components/ErrorFallback";
import { AppSplash } from "../src/components/AppSplash";
import { AppTourProvider } from "../src/tour/AppTourProvider";
import { ensureNotificationsFresh, NOTIF_KEY } from "../src/lib/namazNotifications";
// Import yan etkisi önemli: arka plan görevi tanımı global kapsamda kurulur.
import { registerBackgroundRefresh } from "../src/lib/backgroundRefresh";
// Import yan etkisi önemli: widget arka plan görevi tanımı global kapsamda kurulur.
import { registerWidgetRefresh } from "../src/widgets/widgetRefresh";
import { initCloudBackup } from "../src/lib/cloudBackup";
import { useColors } from "../src/hooks/useColors";
import { useStrings } from "../src/i18n";
import layoutStrings from "../src/i18n/strings/layout";
import { storage, STORAGE_KEYS } from "../src/lib/storage";

type NavigationIntegration = { registerNavigationContainer: (ref: unknown) => void };
type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  wrap: <T>(component: T) => T;
  reactNavigationIntegration: (options?: Record<string, unknown>) => NavigationIntegration;
};

// Gerçek @sentry/react-native native modüldür; yeni build gelene kadar (Expo Go
// veya Sentry'siz build) require başarısız olabilir → no-op stub'a düşer,
// uygulama çökmez (geri dönüşlü / build-gated).
let Sentry: SentryLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
} catch {
  Sentry = {
    init: () => {},
    captureException: () => {},
    wrap: (component) => component,
    reactNavigationIntegration: () => ({ registerNavigationContainer: () => {} }),
  };
}

// Sentry'nin otomatik expo-router algılaması (expoRouterIntegration), bu expo-router
// sürümünün store'unu Sentry.init() anında (React ağacı kurulmadan önce) senkron
// okuyor → navigationRef henüz boş, "incompatible" uyarısı verip pes ediyor (bilinen
// üçüncü parti zamanlama sorunu). Bunun yerine navigasyon entegrasyonunu kendimiz
// oluşturup, RootLayout mount olduktan SONRA (navigationRef gerçekten dolmuşken)
// elle kaydediyoruz — aynı navigasyon breadcrumb/performans takibini sağlar.
const navigationIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  // Dev'de 0: performans izleme (navigation transaction + native frame/stall
  // tracking) her tab dokunuşunda native köprüye senkron çağrı + (debug:true
  // sayesinde) ayrıntılı konsol logu üretiyordu — Metro'ya bağlıyken bu gerçekten
  // yavaş, tıklamada donma hissi buradan geliyordu. Crash yakalama etkilenmez,
  // yalnızca performans transaction'ları kapanıyor.
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  integrations: [navigationIntegration],
  // Native frame/stall tracking, her navigasyon span'ında (her tab dokunuşu
  // dahil) native köprüye ek çağrı + JS tarafında sürekli takip yapar — dev'deki
  // "tıklamada donma" hissinin asıl kaynağı buydu. tracesSampleRate sadece
  // event GÖNDERİMİNİ örnekler, bu takibin KURULMASINI engellemez; yani
  // production'da (tracesSampleRate 0.2) aynı donma hissi hâlâ oluşabiliyordu.
  // Basit navigasyon/crash breadcrumb'ları için bu ayrıntı düzeyi gereksiz.
  enableNativeFramesTracking: false,
  enableStallTracking: false,
  // SDK'nın bilinen hatası (tracesSampleRate < 1 iken app start ölçümü ilk
  // sample'lanmayan transaction'ın span id'sine kilitleniyor ve asla eşleşmiyor
  // → "[AppStart] ... does not match" uyarısı, https://github.com/getsentry/sentry-react-native/issues/5757).
  // Bu metriği kullanmıyoruz, kapatmak uyarıyı gerçek kaynağında çözer.
  enableAppStartTracking: false,
  // DSN yoksa (env eksik) tamamen kapalı kalsın — boşa init olmasın.
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

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
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
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

function AppContent({ needsOnboarding }: { needsOnboarding: boolean }) {
  // Header/StatusBar uygulama temasını izler — "auto" yalnız sistem temasını
  // izlerdi, ana sayfadaki manuel tema düğmesi header'ları etkilemezdi.
  const c = useColors();
  const t = useStrings(layoutStrings);

  // İlk kurulum: Stack mount olduktan sonra onboarding'e geç (izinler orada,
  // bağlam içinde istenir). replace → geri tuşu onboarding'e dönemez.
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding]);

  return (
    <SafeAreaProvider>
      <StatusBar style={c.isDark ? "light" : "dark"} />
      <AppTourProvider>
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.text,
          headerTitleStyle: { color: c.text },
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)"                         options={{ headerShown: false }} />
        <Stack.Screen name="onboarding"                     options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="surah/[id]"                     options={{ headerBackTitle: t.back }} />
        <Stack.Screen name="ayah/[surahId]/[ayahNumber]"    options={{ headerShown: false }} />
        <Stack.Screen name="surah/[surahId]/ayah/[ayahNumber]" options={{ headerShown: false }} />
        <Stack.Screen name="tafsir/[surahId]"               options={{ headerBackTitle: t.back }} />
        <Stack.Screen name="elifba/index"                          options={{ title: t.elifba, headerBackTitle: t.back }} />
        <Stack.Screen name="elifba/[dersId]"                      options={{ headerBackTitle: t.backLessons }} />
        <Stack.Screen name="ibadet-rehberi"                  options={{ title: t.worshipGuide, headerBackTitle: t.back }} />
        <Stack.Screen name="namaz"                          options={{ title: t.prayerWorship, headerBackTitle: t.back }} />
        <Stack.Screen name="bildirimler"                    options={{ title: t.notifications, headerBackTitle: t.back }} />
        <Stack.Screen name="manevi-siginak"                 options={{ title: t.refuge, headerBackTitle: t.back }} />
        <Stack.Screen name="manevi-siginak/ismi-azam"       options={{ title: t.ismiAzam, headerBackTitle: t.back }} />
        <Stack.Screen name="search"                         options={{ title: t.search, headerBackTitle: t.back }} />
        <Stack.Screen name="mushaf/index"                         options={{ title: t.mushaf, headerBackTitle: t.back, headerShown: false }} />
        <Stack.Screen name="mushaf-sayfa"                         options={{ headerShown: false }} />
        <Stack.Screen name="mushaf/[surahId]/[ayahNumber]"        options={{ headerBackTitle: t.backMushaf, headerShown: false }} />
        <Stack.Screen name="root/index"                           options={{ title: t.roots, headerBackTitle: t.back }} />
        <Stack.Screen name="root/[root]/index"                    options={{ headerBackTitle: t.backRoots }} />
        <Stack.Screen name="kible"                                options={{ title: t.qibla, headerBackTitle: t.back }} />
        <Stack.Screen name="hatim"                                options={{ headerShown: false }} />
        <Stack.Screen name="siyer"                                options={{ title: t.siyer, headerBackTitle: t.back }} />
        <Stack.Screen name="peygamber-kissalari"                  options={{ title: t.stories, headerBackTitle: t.back }} />
        <Stack.Screen name="mubarek-gunler"                       options={{ title: t.blessed, headerBackTitle: t.back }} />
        <Stack.Screen name="hadisler"                             options={{ title: t.hadiths, headerBackTitle: t.back }} />

        <Stack.Screen name="sure-listesi"                         options={{ title: t.surahList, headerBackTitle: t.back }} />
        <Stack.Screen name="favoriler"                           options={{ title: t.favorites, headerBackTitle: t.back }} />
        <Stack.Screen name="notlar"                              options={{ title: t.notes, headerBackTitle: t.back }} />
        <Stack.Screen name="ne-ogreneyim"                        options={{ headerShown: false }} />
        <Stack.Screen name="hakkinda"                            options={{ headerShown: false }} />
        <Stack.Screen name="namaz-rehberi"                       options={{ headerShown: false }} />
        <Stack.Screen name="dualar"                              options={{ title: t.duas, headerBackTitle: t.back }} />
        <Stack.Screen name="esma"                                options={{ title: t.names, headerBackTitle: t.back }} />
        <Stack.Screen name="elifba/harf-i-tarif"                 options={{ title: t.harfITarif, headerBackTitle: t.back }} />
      </Stack>
      </AppTourProvider>
    </SafeAreaProvider>
  );
}

function RootLayout() {
  const [videoFinished, setVideoFinished] = useState(false);
  const [fontsLoaded] = Font.useFonts({
    "Amiri":      require("../assets/fonts/Amiri-Regular.ttf"),
    "Amiri-Bold": require("../assets/fonts/Amiri-Bold.ttf"),
    // KFGQPC Uthmanic HAFS (242KB) — mushaf sayfa görünümünün hattı; basılı
    // Medine mushafı hattına en yakın görünüm, Osmani imlâ ile tam uyumlu.
    "UthmanicHafs": require("../assets/fonts/UthmanicHafs.ttf"),
  });
  const navigationRef = useNavigationContainerRef();
  // Uygulamayı açan/öne getiren bildirim yanıtı — cold start (uygulama tamamen
  // kapalıyken bildirimle açılma) DAHİL. Manuel listener cold start'ı kaçırıyordu.
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // İlk kurulum kontrolü — splash sürerken okunur, karar gelmeden Stack açılmaz
  // (aksi halde ana sayfa bir an görünüp onboarding'e atlardı).
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const done = await storage.getString(STORAGE_KEYS.onboarding);
        if (done === "1") { setNeedsOnboarding(false); return; }
        // Güncelleme yapan MEVCUT kullanıcı: bildirim tercihi zaten yazılmış —
        // onboarding'i sessizce tamamlanmış say, karşılama ekranıyla rahatsız etme.
        const notifPref = await storage.getString(NOTIF_KEY);
        if (notifPref !== null) {
          storage.setString(STORAGE_KEYS.onboarding, "1").catch(() => {});
          setNeedsOnboarding(false);
          return;
        }
        setNeedsOnboarding(true);
      } catch {
        setNeedsOnboarding(false); // okunamadı — kullanıcıyı bloklamak yerine normal aç
      }
    })();
  }, []);

  const ready = videoFinished && !!fontsLoaded && needsOnboarding !== null;

  const handleSplashFinish = useCallback(() => {
    setVideoFinished(true);
  }, []);

  // Sentry'nin otomatik expo-router algılaması bu sürümde çalışmıyor (yukarıdaki
  // yorum) — navigationRef burada, ağaç kurulduktan sonra, dolu haliyle elle
  // kaydediliyor.
  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  // Native splash'i mount'ta hemen kaldır — altındaki animasyonlu AppSplash görünsün.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Açılış sayacı hemen ilerler; puanlama SORUSU ise splash/onboarding bitip
  // kullanıcı gerçekten uygulamadayken (ready + kısa gecikme) sorulur. Play
  // In-App Review tek atımlık — cold start'ta splash üstüne sorup hakkı yakma.
  useEffect(() => {
    trackAppOpen();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { maybeAskReview(); }, 12_000);
    return () => clearTimeout(timer);
  }, [ready]);

  // Bulut yedek: anonim oturum aç, ilk kurulumda ilerlemeyi geri yükle, sonrasında
  // değişiklikleri debounce'la Firestore'a yaz. Native modül yoksa (eski build)
  // sessiz no-op; beklenen hatalar modül içinde yutulur, buraya sızan BEKLENMEDİK'tir.
  useEffect(() => {
    initCloudBackup().catch((err) => { Sentry.captureException(err); });
  }, []);

  useEffect(() => {
    // Bildirime tıklanınca ilgili ekrana git. useLastNotificationResponse hem
    // uygulama açıkken/arka plandayken tıklamayı HEM DE uygulama tamamen
    // kapalıyken bildirimle açılmayı (cold start) yakalar — eski manuel
    // addNotificationResponseReceivedListener cold start'ı kaçırıyordu.
    if (!lastNotificationResponse) return;
    const data = lastNotificationResponse.notification.request.content.data as Record<string, unknown>;
    const t = setTimeout(() => {
      if (data?.surahId && data?.ayahNumber) {
        router.push(`/ayah/${data.surahId}/${data.ayahNumber}` as Href);
      } else if (data?.route) {
        router.push(data.route as Href);
      }
    }, 500); // Stack mount'u için kısa bekleme
    return () => clearTimeout(t);
  }, [lastNotificationResponse]);

  // Bildirimleri (namaz vakti + günlük ayet/dua) her açılışta VE her arka plandan
  // öne gelişte taze tut — ilk hiç açılışta varsayılan AÇIK dener, sonrasında
  // günde en az bir kez saat/içerik yeniler. Yalnız uygulama açılışına bağlı
  // kalsaydı (eskisi gibi) günlerce arka planda tutulan bir oturumda bildirimler
  // donuk kalırdı.
  useEffect(() => {
    // namazNotifications.ts kendi beklenen hata yollarını (ağ, izin reddi) zaten
    // sessizce yönetir — buraya bir hata sızarsa BEKLENMEDİK'tir, Sentry'ye bildir
    // (aksi halde bir kullanıcıda bildirimler hiç planlanmasa bile fark edilmez).
    const reportUnexpected = (err: unknown) => { Sentry.captureException(err); };
    ensureNotificationsFresh().catch(reportUnexpected);
    // Uygulama kapalıyken de tazeleme: OS'e periyodik arka plan görevi kaydet
    // (yeni build gerektirir; eski build'de sessiz no-op).
    registerBackgroundRefresh().catch(reportUnexpected);
    // Emir Ayetleri widget'ını da aynı şekilde tazele (yeni build gerektirir).
    registerWidgetRefresh().catch(reportUnexpected);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") ensureNotificationsFresh().catch(reportUnexpected);
    });
    return () => sub.remove();
  }, []);

  if (!ready) return <AppSplash onFinish={handleSplashFinish} />;

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent needsOnboarding={needsOnboarding === true} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      gcTime: 30 * 60 * 1000,
    },
  },
});

export default Sentry.wrap(RootLayout);
