// Son hedef onboarding boyunca korunur; aynı bildirim yanıtı yalnız bir kez işlenir.
export class PendingNavigation {
  private target: string | null = null;
  private responses = new Set<string>();
  remember(target: string, responseId?: string) {
    if (responseId) {
      if (this.responses.has(responseId)) return;
      this.responses.add(responseId);
    }
    this.target = target;
  }
  take(navigationReady: boolean, onboarded: boolean): string | null {
    if (!navigationReady || !onboarded) return null;
    const target = this.target;
    this.target = null;
    return target;
  }
}
