export type BackSubscription = { remove: () => void };
export type BackHandlerLike = {
  addEventListener: (event: "hardwareBackPress", handler: () => boolean) => BackSubscription;
};

export type OnboardingBackState = {
  focused: boolean;
  completed: boolean;
  locked: boolean;
  step: number;
  hasResult: boolean;
};

/**
 * Onboarding yalnız odaklandığında ve tamamlanmadan önce geri tuşunu tüketir.
 * 2. adımda (sonuç ekranı yokken) 1. adıma döner; odak dışıysa veya tamamlandıysa
 * tuşu sistem/navigasyona bırakır (false).
 */
export function handleOnboardingBackPress(
  state: OnboardingBackState,
  goToFirstStep: () => void,
): boolean {
  if (!state.focused || state.completed) return false;
  if (!state.locked && state.step === 2 && !state.hasResult) {
    goToFirstStep();
  }
  return true;
}

/**
 * Rehber örtüsü yalnız etkinken geri tuşunu yakalayıp örtüyü kapatır;
 * kapandıktan sonra dinleyici veya geçersiz kapanış tuşu yutmaz.
 */
export function handleTourBackPress(active: boolean, closeTour: () => void): boolean {
  if (!active) return false;
  closeTour();
  return true;
}

/**
 * Yalnız etkin olduğunda hardwareBackPress dinleyicisi ekler; temizleme
 * idempotenttir ve kaldırılan dinleyicinin sonradan tuş yutmasını engeller.
 */
export function registerFocusedBackHandler(
  backHandler: BackHandlerLike,
  active: boolean,
  onBack: () => boolean,
): () => void {
  if (!active) return () => {};
  let removed = false;
  const subscription = backHandler.addEventListener("hardwareBackPress", () => {
    if (removed) return false;
    return onBack();
  });
  return () => {
    if (removed) return;
    removed = true;
    subscription.remove();
  };
}
