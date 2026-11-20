export type Lang = "tr" | "en";
export type LangPreference = Lang | "system";

export interface LanguageState {
  preference: LangPreference;
  current: Lang;
}

/** Aynı dildeki açık tercih de ayrı bir durumdur; değişmezse referansı koru. */
export function updateLanguageState(
  state: LanguageState,
  preference: LangPreference,
  systemLang: Lang,
): LanguageState {
  const current = preference === "system" ? systemLang : preference;
  return state.preference === preference && state.current === current
    ? state
    : { preference, current };
}
