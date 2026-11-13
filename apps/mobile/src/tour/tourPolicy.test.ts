import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveGuideState, shouldOfferGuide, shouldShowHint, isExistingGuideUser, canOpenHint,
  HintSession, hintTargetVisible, hintAutoAnchorVisible, readSeenHints, parseSeenHints, type HintContext, type GuideStatus } from "./tourPolicy.ts";

test("eski 6, daha eski ve bozuk eski kayıtlar davet oluşturmaz", () => {
  for (const legacy of ["6", "1", "true", "", "{bozuk"]) {
    for (const onboarded of [true, false]) {
      const state = resolveGuideState(null, legacy, onboarded);
      assert.equal(state.status, "legacyHandled");
      assert.equal(shouldOfferGuide(state, true), false);
    }
  }
});
test("onboarding tamamlamış kayıtsız kullanıcı mevcut kullanıcıdır", () => {
  assert.equal(resolveGuideState(null, null, true).status, "existingUser");
  assert.equal(shouldOfferGuide(resolveGuideState(null, null, true), true), false);
});
test("yeni kurulum daveti yalnız onboarding tamamlanınca görünür; yeniden açılışta korunur", () => {
  const state = resolveGuideState(null, null, false);
  assert.equal(state.status, "eligible");
  assert.equal(shouldOfferGuide(state, false), false);
  assert.equal(shouldOfferGuide(state, true), true);
  assert.deepEqual(resolveGuideState(JSON.stringify(state), null, true), state);
});
test("kapatma, atlama ve tamamlama birbirinden ayrı saklanır, tekrar davet üretmez", () => {
  for (const status of ["offerDismissed", "skipped", "completed", "existingUser", "legacyHandled"] satisfies GuideStatus[]) {
    const state = resolveGuideState(JSON.stringify({ version: 7, status }), null, true);
    assert.equal(state.status, status);
    assert.equal(shouldOfferGuide(state, true), false);
  }
});
test("bozuk yeni kayıt güvenli biçimde mevcut kullanıcı sayılır", () => {
  for (const raw of ["", "{", "null", "[]", '"eligible"', '{"status":"eligible"}', '{"version":7,"status":"unknown"}']) {
    const state = resolveGuideState(raw, null, false);
    assert.equal(state.status, "existingUser");
    assert.equal(shouldOfferGuide(state, true), false);
  }
  assert.equal(shouldOfferGuide(null, true), false);
});
const ready: HintContext = { enabled: true, existingUser: false, focused: true, dataReady: true,
  targetVisible: true, overlayOpen: false, hintsThisVisit: 0, hintsThisSession: 0,
  interactedSinceGuide: true, seenVersion: 0, contentVersion: 1 };

test("otomatik gösterimin her engeli tek başına yeterlidir", () => {
  assert.equal(shouldShowHint(ready), true);
  for (const blocked of [
    { enabled: false }, { existingUser: true }, { focused: false }, { dataReady: false },
    { targetVisible: false }, { overlayOpen: true }, { hintsThisVisit: 1 }, { hintsThisVisit: 2 },
    { hintsThisSession: 2 }, { hintsThisSession: 3 }, { interactedSinceGuide: false },
    { seenVersion: 1 }, { seenVersion: 2 },
  ]) assert.equal(shouldShowHint({ ...ready, ...blocked }), false, JSON.stringify(blocked));
  assert.equal(shouldShowHint({ ...ready, hintsThisSession: 1 }), true);
  assert.equal(shouldShowHint({ ...ready, seenVersion: 1, contentVersion: 2 }), true);
});

test("eski kohort engellenir; tamamlanan veya atlanan yeni rehber eski kohort oluşturmaz", () => {
  for (const status of ["legacyHandled", "existingUser", "completed", "skipped", "eligible", "offerDismissed"] satisfies GuideStatus[]) {
    const existingUser = isExistingGuideUser({ version: 7, status });
    assert.equal(existingUser, status === "legacyHandled" || status === "existingUser");
    assert.equal(shouldShowHint({ ...ready, existingUser }), !existingUser);
  }
  assert.equal(isExistingGuideUser(null), true);
});

test("manuel yardım kota, kohort, etkileşim ve görülmeden bağımsızdır; hazır olma zorunludur", () => {
  const exhausted = { ...ready, enabled: false, existingUser: true, hintsThisVisit: 3,
    hintsThisSession: 5, seenVersion: 1, interactedSinceGuide: false };
  assert.equal(shouldShowHint(exhausted), false);
  assert.equal(canOpenHint(exhausted), true);
  for (const blocked of [{ focused: false }, { dataReady: false }, { targetVisible: false }, { overlayOpen: true }]) {
    assert.equal(canOpenHint({ ...exhausted, ...blocked }), false);
  }
});

test("tam görünür hedef kabul edilir; küçük hedefin dikey kırpılması ertelenir", () => {
  const viewport = { x: 0, y: 80, width: 360, height: 600 };
  const target = { x: 12, y: 100, width: 336, height: 70 };
  assert.equal(hintTargetVisible(target, viewport), true);
  for (const change of [{ y: 79 }, { y: 645 }, { x: -2 }, { width: 360 }]) {
    assert.equal(hintTargetVisible({ ...target, ...change }, viewport), false);
  }
});

test("viewport'tan uzun hedef yeterli kısmı görünürse kabul edilir", () => {
  const viewport = { x: 0, y: 80, width: 360, height: 600 };
  const target = { x: 12, y: -200, width: 336, height: 1000 };
  assert.equal(hintTargetVisible(target, viewport), true);
  assert.equal(hintTargetVisible({ ...target, y: 530 }, viewport), true);
  assert.equal(hintTargetVisible({ ...target, y: -770 }, viewport), true);
  assert.equal(hintTargetVisible({ ...target, y: 531 }, viewport), false);
  assert.equal(hintTargetVisible({ ...target, y: -771 }, viewport), false);
});

test("kısa viewport'ta anlamlı görünürlük en az 48 birim gerektirir", () => {
  const viewport = { x: 0, y: 0, width: 360, height: 100 };
  const target = { x: 12, y: 52, width: 336, height: 300 };
  assert.equal(hintTargetVisible(target, viewport), true);
  assert.equal(hintTargetVisible({ ...target, y: 53 }, viewport), false);
});

test("görünür genişlik viewport ile sınırlıdır ve yalnız bir birim tolerans tanır", () => {
  const viewport = { x: 0, y: 80, width: 360, height: 600 };
  assert.equal(hintTargetVisible({ x: -20, y: 100, width: 400, height: 70 }, viewport), true);
  assert.equal(hintTargetVisible({ x: -1, y: 100, width: 336, height: 70 }, viewport), true);
  assert.equal(hintTargetVisible({ x: -2, y: 100, width: 336, height: 70 }, viewport), false);
});

test("hedefin veya viewport'un sıfır boyutu görünür sayılmaz", () => {
  const rect = { x: 0, y: 0, width: 360, height: 600 };
  for (const size of [{ width: 0 }, { height: 0 }]) {
    assert.equal(hintTargetVisible({ ...rect, ...size }, rect), false);
    assert.equal(hintTargetVisible(rect, { ...rect, ...size }), false);
  }
});

test("görülme sürümleri güvenle okunur", () => {
  assert.deepEqual(parseSeenHints({ surahInteraction: 1, rootMap: 2, bad: "1", zero: 0 }), { surahInteraction: 1, rootMap: 2 });
  for (const raw of [null, [], "bad", 1]) assert.deepEqual(parseSeenHints(raw), {});
});

test("aday kota tüketmez; ziyaret başına bir, süreç oturumu boyunca iki gerçek gösterim", () => {
  const session = new HintSession();
  const first = { id: "surahInteraction", contentVersion: 1 };
  const second = { id: "ayahTabs", contentVersion: 1 };
  const third = { id: "rootMap", contentVersion: 1 };
  assert.equal(session.show(first, { ...ready, targetVisible: false }, false), false);
  assert.equal(session.count, 0);
  assert.deepEqual(session.seen, {});
  assert.equal(session.show(first, ready, false), true);
  assert.deepEqual(session.seen, { surahInteraction: 1 });
  assert.equal(session.show(second, { ...ready, hintsThisVisit: 1 }, false), false);
  assert.equal(session.count, 1);
  assert.equal(session.show(first, ready, false), false);
  assert.equal(session.show(second, ready, false), true);
  assert.equal(session.show(third, ready, false), false);
  assert.equal(session.count, 2);
});

test("rehber sonrası yeni etkileşim gerekir; rehber ve manuel yardım kayıtları sıfırlamaz", () => {
  const session = new HintSession();
  const hint = { id: "lessonProgress", contentVersion: 1 };
  session.interactedSinceGuide = false;
  assert.equal(session.show(hint, ready, false), false);
  assert.equal(session.show(hint, { ...ready, existingUser: true, hintsThisVisit: 2 }, true), true);
  assert.equal(session.count, 0);
  assert.deepEqual(session.seen, {});
  session.interactedSinceGuide = true;
  assert.equal(session.show(hint, ready, false), true);
  session.interactedSinceGuide = false;
  session.interactedSinceGuide = true;
  assert.equal(session.show(hint, ready, false), false);
  assert.equal(session.show(hint, ready, true), true);
  assert.equal(session.count, 1);
  assert.deepEqual(session.seen, { lessonProgress: 1 });
  const nextLaunch = new HintSession();
  nextLaunch.seen = parseSeenHints(JSON.parse(JSON.stringify(session.seen)));
  assert.equal(nextLaunch.show(hint, ready, false), false);
});

test("eski kayıt varsa bekleyen yeni davet de bastırılır", () => {
  const state = resolveGuideState('{"version":7,"status":"eligible"}', "6", true);
  assert.equal(state.status, "legacyHandled");
  assert.equal(shouldOfferGuide(state, true), false);
});


test("otomatik kök ipucu görünür başlık gerektirir; haritanın altı yeterli değildir", () => {
  const bounds = { x: 0, y: 0, width: 360, height: 600 };
  assert.equal(hintTargetVisible({ x: 0, y: -200, width: 360, height: 500 }, bounds), true);
  assert.equal(hintAutoAnchorVisible({ x: 0, y: -248, width: 360, height: 48 }, bounds), false);
  assert.equal(hintAutoAnchorVisible({ x: 0, y: 100, width: 360, height: 48 }, bounds), true);
  assert.equal(hintAutoAnchorVisible(null, bounds), false);
});

test("bozuk JSON ipuçlarını görülmüş sayar; eksik ve geçerli kayıt korunur", () => {
  const hints = [{ id: "rootMap", contentVersion: 1 }, { id: "lessonProgress", contentVersion: 2 }];
  assert.deepEqual(readSeenHints(null, hints), {});
  assert.deepEqual(readSeenHints('{}', hints), {});
  assert.deepEqual(readSeenHints('{"rootMap":1}', hints), { rootMap: 1 });
  for (const raw of ['', '{', 'null', '[]', '"bad"']) {
    const session = new HintSession();
    session.seen = readSeenHints(raw, hints);
    assert.deepEqual(session.seen, { rootMap: 1, lessonProgress: 2 });
    assert.equal(session.show(hints[0], ready, false), false);
    assert.equal(session.show(hints[0], ready, true), true);
  }
});
