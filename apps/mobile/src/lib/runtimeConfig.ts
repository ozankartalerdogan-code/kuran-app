function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const DEFAULT_WEB_BASE_URL = "https://kuran-app-web-ozan-s-projects8.vercel.app";

export const WEB_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_WEB_URL ?? DEFAULT_WEB_BASE_URL,
);

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL ?? `${WEB_BASE_URL}/api/v1`,
);

export const AUDIO_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_AUDIO_BASE_URL ?? WEB_BASE_URL,
);
