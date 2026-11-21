import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleOnboardingBackPress,
  handleTourBackPress,
  registerFocusedBackHandler,
  type BackHandlerLike,
} from "./backHandlerPolicy.ts";

function createFakeBackHandler() {
  const listeners: Array<() => boolean> = [];
  const backHandler: BackHandlerLike = {
    addEventListener: (_event, handler) => {
      listeners.push(handler);
      return {
        remove: () => {
          const idx = listeners.lastIndexOf(handler);
          if (idx !== -1) listeners.splice(idx, 1);
        },
      };
    },
  };
  const dispatchBack = () => {
    // React Native BackHandler en son eklenen dinleyiciden geriye doğru çalıştırır.
    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      if (listeners[i]()) return true;
    }
    return false;
  };
  return { backHandler, dispatchBack, count: () => listeners.length };
}

test("onboarding odaktayken 2. adımda 1. adıma döner, 1. adımda tutar; odak kaybında kaldırılır", () => {
  const { backHandler, dispatchBack, count } = createFakeBackHandler();
  let step = 2;
  let focused = true;
  let completed = false;
  let locked = false;
  let hasResult = false;

  const unregister = registerFocusedBackHandler(backHandler, true, () =>
    handleOnboardingBackPress(
      { focused, completed, locked, step, hasResult },
      () => { step = 1; },
    ),
  );

  assert.equal(count(), 1);
  // 2. adımda geri → 1. adıma dönüp olayı tüketir
  assert.equal(dispatchBack(), true);
  assert.equal(step, 1);

  // 1. adımda geri → onboarding'den kaçışı engellemek için olayı tüketir
  assert.equal(dispatchBack(), true);
  assert.equal(step, 1);

  // Sonuç veya kilit varken geri 1. adıma döndürmez
  step = 2;
  hasResult = true;
  assert.equal(dispatchBack(), true);
  assert.equal(step, 2);
  hasResult = false;
  locked = true;
  assert.equal(dispatchBack(), true);
  assert.equal(step, 2);

  // Ekran unmount edilmeden odaktan düşse bile dinleyici kaldırılır ve sonraki ekranlara geçer
  locked = false;
  focused = false;
  unregister();
  unregister(); // idempotent
  assert.equal(count(), 0);
  assert.equal(dispatchBack(), false);
  assert.equal(step, 2);

  // Tamamlandı işareti tek başına da tuşu bırakır
  completed = true;
  assert.equal(handleOnboardingBackPress({ focused: true, completed, locked: false, step: 2, hasResult: false }, () => { step = 1; }), false);
});

test("TourOverlay etkinken geri tuşu rehberi kapatır; kapanınca dinleyici kalmaz", () => {
  const { backHandler, dispatchBack, count } = createFakeBackHandler();
  let closed = 0;

  assert.equal(handleTourBackPress(false, () => { closed += 1; }), false);
  const noopUnregister = registerFocusedBackHandler(backHandler, false, () => true);
  assert.equal(count(), 0);
  noopUnregister();

  const unregister = registerFocusedBackHandler(backHandler, true, () =>
    handleTourBackPress(true, () => { closed += 1; }),
  );
  assert.equal(count(), 1);
  assert.equal(dispatchBack(), true);
  assert.equal(closed, 1);

  unregister();
  assert.equal(count(), 0);
  assert.equal(dispatchBack(), false);
  assert.equal(closed, 1);
});
