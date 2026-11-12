// Uygulama KAPALIYKEN de "emir ayeti" widget'ını tazeler (Android WorkManager,
// bkz. src/lib/backgroundRefresh.ts ile aynı desen). OS gerçek zamanlamayı kendi
// belirler (Doze, pil, kullanım sıklığı) — 4 saatlik eşik yalnız "en erken" sınırdır
// (rotasyon da günde 6 dilim/4 saat olduğu için bu değer emirRotation.ts ile uyumlu
// tutulmalı). Uygulama her açıldığında da bir kez tazelenir ki arka plan görevi
// henüz çalışmamışsa widget bayat kalmasın.
//
// Native modül: yeni build gelene kadar (mevcut dev client / eski build) require
// başarısız olur → no-op. (storage/Sentry/backgroundRefresh ile aynı build-gated desen.)
import { Platform } from "react-native";
import { currentEmirAyet, WIDGET_NAME } from "./emirRotation";

type TaskManagerLike = {
  defineTask: (name: string, fn: () => Promise<unknown>) => void;
  isTaskRegisteredAsync: (name: string) => Promise<boolean>;
};
type BackgroundTaskLike = {
  registerTaskAsync: (name: string, opts: { minimumInterval: number }) => Promise<void>;
  BackgroundTaskResult: { Success: unknown; Failed: unknown };
};
type AndroidWidgetLike = {
  requestWidgetUpdate: (props: {
    widgetName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderWidget: (info: unknown) => any;
  }) => Promise<void>;
};

let TaskManager: TaskManagerLike | null = null;
let BackgroundTask: BackgroundTaskLike | null = null;
let AndroidWidgetModule: AndroidWidgetLike | null = null;
// Widget yalnız Android'de var; iOS'ta kütüphane throw etmeyip no-op modül
// döndürüyor → guard olmasa iOS'ta boşuna arka plan görevi kaydedilirdi.
if (Platform.OS === "android") try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  TaskManager = require("expo-task-manager");
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  BackgroundTask = require("expo-background-task");
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  AndroidWidgetModule = require("react-native-android-widget");
} catch {
  TaskManager = null;
  BackgroundTask = null;
  AndroidWidgetModule = null;
}

const TASK_NAME = "emir-widget-tazeleme";

async function refreshWidget(): Promise<void> {
  if (!AndroidWidgetModule) return;
  const ayet = currentEmirAyet();
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { buildEmirWidgetRepresentation } = require("./EmirAyetWidget");
  await AndroidWidgetModule.requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info: unknown) => buildEmirWidgetRepresentation(ayet, (info as { height?: number } | null)?.height),
  });
}

// Görev tanımı GLOBAL kapsamda yapılmalı — Android uygulamayı arka planda
// headless başlattığında da tanımlı olsun (bileşen içinde tanımlansaydı olmazdı).
if (TaskManager && BackgroundTask) {
  const BT = BackgroundTask;
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await refreshWidget();
      return BT.BackgroundTaskResult.Success;
    } catch {
      return BT.BackgroundTaskResult.Failed;
    }
  });
}

/** Dil değişince widget'ı hemen yeni dilde çiz (arka plan görevini beklemeden). */
export async function refreshWidgetNow(): Promise<void> {
  try { await refreshWidget(); } catch { /* widget yok/eklenmemiş — sessiz */ }
}

export async function registerWidgetRefresh(): Promise<void> {
  if (!TaskManager || !BackgroundTask) return;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 4 * 60 });
    }
  } catch { /* kayıt başarısız — bir sonraki açılışta tekrar denenir */ }
  refreshWidget().catch(() => {});
}
