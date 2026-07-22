export type AyahImageShareContent = {
  title: string;
  message: string;
  reading: string | null;
};

type AyahImageShareInput = {
  surahName: string;
  ayahNumber: number;
  reading?: string | null;
  webUrl: string;
};

export function buildAyahImageShareContent({
  surahName,
  ayahNumber,
  reading,
  webUrl,
}: AyahImageShareInput): AyahImageShareContent {
  const reference = `${surahName} ${ayahNumber}. Ayet`;

  return {
    title: reference,
    message: [reference, "Kuran Yolu", webUrl].join("\n\n"),
    reading: reading?.trim() || null,
  };
}

export type ImageSharePlatform = "android" | "ios";

type NativeImageShareOptionsInput = {
  fileUri: string;
  title: string;
  message: string;
  platform: ImageSharePlatform;
};

export function buildNativeImageShareOptions({
  fileUri,
  title,
  message,
  platform,
}: NativeImageShareOptionsInput) {
  const options = {
    url: fileUri,
    type: "image/png" as const,
    title,
    message,
    failOnCancel: false as const,
  };

  return platform === "android"
    ? { ...options, useInternalStorage: true as const }
    : options;
}

export function getImageShareResult(result: {
  success: boolean;
  dismissedAction?: boolean;
}): "shared" | "cancelled" {
  return result.dismissedAction || !result.success ? "cancelled" : "shared";
}
