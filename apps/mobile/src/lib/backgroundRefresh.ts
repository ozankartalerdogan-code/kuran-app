// Uygulama KAPALIYKEN de namaz vakti bildirimlerini taze tutar (Android
// WorkManager / iOS BGTaskScheduler). 7 günlük DATE planlaması emniyet ağıdır;
// bu görev OS izin verdikçe (en erken ~12 saatte bir) çalışıp pencereyi ileri
// kaydırır. Kullanıcı uygulamayı "zorla durdur" yaparsa OS hiçbir arka plan
// işine izin vermez — bu durumda 7 günlük pencere devrededir.
//
// Native modül: yeni build gelene kadar (mevcut dev client / eski build)
// require başarısız olur → no-op. (storage/Sentry ile aynı build-gated desen.)
import { ensureNotificationsFresh } from "./namazNotifications";

type TaskManagerLike = {
  defineTask: (name: string, fn: () => Promise<unknown>) => void;
  isTaskRegisteredAsync: (name: string) => Promise<boolean>;
};
type BackgroundTaskLike = {
  registerTaskAsync: (name: string, opts: { minimumInterval: number }) => Promise<void>;
  BackgroundTaskResult: { Success: unknown; Failed: unknown };
};

let TaskManager: TaskManagerLike | null = null;
let BackgroundTask: BackgroundTaskLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManager = require("expo-task-manager");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BackgroundTask = require("expo-background-task");
} catch {
  TaskManager = null;
  BackgroundTask = null;
}

const TASK_NAME = "namaz-bildirim-tazeleme";

// Görev tanımı GLOBAL kapsamda yapılmalı — Android uygulamayı arka planda
// headless başlattığında da tanımlı olsun (bileşen içinde tanımlansaydı olmazdı).
if (TaskManager && BackgroundTask) {
  const BT = BackgroundTask;
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      // interactive:false — arka planda izin penceresi açılamaz; ilk-kurulum
      // akışı yalnız gerçek uygulama açılışına bırakılır.
      await ensureNotificationsFresh({ interactive: false });
      return BT.BackgroundTaskResult.Success;
    } catch {
      return BT.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundRefresh(): Promise<void> {
  if (!TaskManager || !BackgroundTask) return;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!registered) {
      // Dakika cinsinden "en erken" eşik — OS gerçek zamanlamayı kendi belirler
      // (pil, Doze, kullanım sıklığı). Günde ~1-2 çalışma yeterli.
      await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 12 * 60 });
    }
  } catch { /* kayıt başarısız — bir sonraki açılışta tekrar denenir */ }
}
