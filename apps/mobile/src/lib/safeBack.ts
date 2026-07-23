import type { Href } from "expo-router";

type BackRouter = {
  canGoBack(): boolean;
  back(): void;
  replace(href: Href): void;
};

export function goBackOrReplace(navigation: BackRouter, fallback: Href): void {
  if (navigation.canGoBack()) navigation.back();
  else navigation.replace(fallback);
}
