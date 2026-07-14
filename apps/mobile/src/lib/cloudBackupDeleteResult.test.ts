import { test } from "node:test";
import assert from "node:assert/strict";
import { getCloudBackupDeleteFeedback } from "./cloudBackupDeleteResult.ts";

test("iki Firebase adımı da başarılıysa tam başarı bildirir", () => {
  const feedback = getCloudBackupDeleteFeedback({ firestore: "deleted", account: "deleted", backupDisabled: true });
  assert.equal(feedback.title, "Silindi");
  assert.match(feedback.message, /yedeğiniz ve anonim hesabınız/);
  assert.equal(feedback.disabled, true);
});

test("hesap silinemediyse tam başarı yerine kısmi başarı bildirir", () => {
  const feedback = getCloudBackupDeleteFeedback({ firestore: "deleted", account: "failed", backupDisabled: true });
  assert.equal(feedback.title, "Yedek Silindi");
  assert.match(feedback.message, /hesabı silinemedi/);
  assert.doesNotMatch(feedback.message, /hesabınız kalıcı olarak silindi/);
});

test("Firestore silinemediyse hata ve aktif durum döner", () => {
  const feedback = getCloudBackupDeleteFeedback({ firestore: "failed", account: "not-attempted", backupDisabled: false });
  assert.equal(feedback.title, "Silinemedi");
  assert.equal(feedback.disabled, false);
});

test("etkin kullanıcı yoksa olmayan hesabı silindi diye sunmaz", () => {
  const feedback = getCloudBackupDeleteFeedback({ firestore: "not-found", account: "not-found", backupDisabled: true });
  assert.equal(feedback.title, "Yedekleme Kapatıldı");
  assert.match(feedback.message, /bulunamadı/);
});
